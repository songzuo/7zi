/**
 * 收银台适配层 —— 「终端客户 → 我们」这一层收款
 * ==================================================================
 * 先说清楚一个关键事实（很多人会搞混）：
 *
 *   CJ 是供应链方，不是支付服务商。它提供的 cjPayUrl / 余额支付，
 *   用途是「我们（CJ 账户持有人）向 CJ 付货款」，**不能拿来收终端客户的钱**。
 *   所以客户侧收款必须由我们自己解决 —— 本模块就是干这个的。
 *
 * 完整资金链路（一次收款、两条腿）：
 *   [终端客户] --①本模块收款--> [我们]
 *                                 ├─②A 成本腿：CJ 余额支付 / CJ 支付链接 --> [CJ] --发货-->
 *                                 └─②B 利润腿：留存进我方账户 / 网关侧自动分账到子账户
 *   （②A 见 cj-channel.ts 的 channelPayBalance；②B 见 settlement.ts 分账台账）
 *
 * 为什么默认不用 Stripe：
 *   Stripe 不支持以加纳主体开户（非洲覆盖有限），而我们的主市场正是加纳/西非。
 *   所以按以下顺序自动选择可用通道：
 *     1) Paystack      —— 加纳/尼日利亚本地主力，支持 MTN MoMo / Telecel / AT Money
 *                          + Visa/Mastercard + 银行转账 + USSD，费率约 1.95%，次日结算
 *     2) Flutterwave   —— 泛非 30+ 国 + 国际卡，适合跨境与海外客户
 *     3) manual（兜底）—— 未配置任何密钥时，给出 MoMo / 银行 / WhatsApp 人工收款指引，
 *                          业务照样能跑，只是需要人工对账
 *
 * 配置来源：**站长在内部面板自助配置**（data/pay-config.json，见 pay-config.ts），
 *           环境变量仍作兜底。改配置即时生效，不需要重启进程。
 */
import { createHmac, timingSafeEqual } from "crypto";
import {
  loadPayConfig,
  resolveProvider,
  parseFlutterwaveSubaccounts,
  type PayProviderChoice,
} from "./pay-config";

export type PayProvider = "paystack" | "flutterwave" | "manual";

export interface PayInstructions {
  title: string;
  lines: string[];
  whatsapp: string;
  wechat: string;
}

/** 分账信息：告诉调用方这笔收款怎么拆 */
export interface PaySplitInfo {
  /** gateway = 网关侧自动分账（钱在网关就分好了）；ledger = 我方台账分账 */
  mode: "gateway" | "ledger";
  /** 利润留存比例（null = 成本优先，剩余全部留存） */
  profitRetainPct: number | null;
  /** 本笔是否真的带上了网关分账参数 */
  gatewayApplied: boolean;
  /** 带上网关分账时，说明分账依据 */
  gatewayNote?: string;
}

export interface PaySession {
  ok: boolean;
  provider: PayProvider;
  mode: "redirect" | "manual";
  /** 跳转支付地址（redirect 模式） */
  url?: string;
  /** 我方订单号，作为支付参考号 */
  reference: string;
  amountUsd: number;
  /** 实际收款货币与金额（本地货币通道） */
  charge?: { currency: string; amount: number };
  instructions?: PayInstructions;
  split?: PaySplitInfo;
  error?: string;
}

/** 公司/客服联系信息（与页脚一致） */
const CONTACT = {
  whatsapp: "+233 248 009 090",
  whatsappLink: "https://wa.me/233248009090",
  wechat: "+86 133 1955 1131",
};

export function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || "https://szspd.cn").replace(/\/+$/, "");
}

export function providerChoice(): PayProviderChoice {
  return loadPayConfig().provider;
}

/** 判断当前环境实际可用的收款通道 */
export function activeProvider(): PayProvider {
  return resolveProvider();
}

export function providerStatus() {
  const c = loadPayConfig();
  const resolved = resolveProvider(c);
  const sub = parseFlutterwaveSubaccounts(c.flutterwaveSubaccounts);
  return {
    choice: c.provider,
    active: resolved,
    paystack: !!c.paystackSecretKey,
    flutterwave: !!c.flutterwaveSecretKey,
    currency: c.currency,
    /** 网关侧自动分账是否已配置 —— 配了利润在网关就分好了，不用我方再手工划账 */
    gatewaySplit: {
      paystack: !!c.paystackSplitCode,
      flutterwave: sub.length > 0,
    },
    splitEnabled: c.splitEnabled,
    note:
      resolved === "manual"
        ? "未配置网关密钥时走 manual 人工收款指引（MoMo / 银行 / WhatsApp），业务不受影响。密钥可在本面板「支付设置」里自助填写。"
        : "在线收款已启用。",
  };
}

function manualInstructions(orderNo: string, amountUsd: number): PayInstructions {
  return {
    title: "Manual payment (Mobile Money / Bank / PayPal)",
    lines: [
      `Order ${orderNo} · Total USD ${amountUsd.toFixed(2)}`,
      "1) Mobile Money (Ghana): MTN MoMo / Telecel Cash / AT Money",
      "2) Bank transfer (Ghana / China) or PayPal / WeChat Pay",
      `Send us the order number ${orderNo} together with your payment receipt — we will confirm and ship within 24h.`,
      "Contact us on WhatsApp or WeChat to get the payment details.",
    ],
    whatsapp: CONTACT.whatsapp,
    wechat: CONTACT.wechat,
  };
}

/** 取本币汇率；未配置返回 null（宁可不收，也不乱算钱） */
function fxRate(currency: string): number | null {
  const c = loadPayConfig();
  if (currency === "USD") return 1;
  if (currency === "GHS") return c.fxGhs;
  if (currency === "NGN") return c.fxNgn;
  return null;
}

function splitInfo(cfg = loadPayConfig(), gatewayApplied = false, note?: string): PaySplitInfo {
  const useGateway = gatewayApplied;
  return {
    mode: useGateway ? "gateway" : "ledger",
    profitRetainPct: cfg.profitRetainPct,
    gatewayApplied: useGateway,
    gatewayNote: note,
  };
}

function manualFallback(
  provider: PayProvider,
  reference: string,
  amountUsd: number,
  error: string
): PaySession {
  return {
    ok: false,
    provider,
    mode: "manual",
    reference,
    amountUsd,
    instructions: manualInstructions(reference, amountUsd),
    error,
  };
}

/**
 * 为订单创建一次收银台会话。
 * 不依赖任何外部账号即可工作（manual 模式），配上密钥后自动升级为在线支付。
 */
export async function createPaySession(input: {
  orderNo: string;
  amountUsd: number;
  customer: { name: string; email: string; phone?: string };
  countryCode?: string;
  /** 覆盖默认通道（一般不用传） */
  provider?: PayProvider;
}): Promise<PaySession> {
  const cfg = loadPayConfig();
  const provider = input.provider || activeProvider();
  const reference = input.orderNo;
  const amountUsd = Math.max(0, Number(input.amountUsd) || 0);

  if (provider === "manual") {
    return {
      ok: true,
      provider: "manual",
      mode: "manual",
      reference,
      amountUsd,
      instructions: manualInstructions(reference, amountUsd),
      split: splitInfo(cfg, false),
    };
  }

  if (provider === "paystack") {
    const currency = (cfg.currency || "GHS").toUpperCase();
    const rate = fxRate(currency);
    if (!rate) {
      return manualFallback(
        provider,
        reference,
        amountUsd,
        `Paystack 需要以 ${currency} 结算，但未配置汇率 PAY_FX_${currency}。请在「支付设置」中填写，或先走人工收款。`
      );
    }
    if (!cfg.paystackSecretKey) {
      return manualFallback(provider, reference, amountUsd, "Paystack 密钥未配置。");
    }
    const amountMinor = Math.round(amountUsd * rate * 100);

    // 网关侧自动分账：Paystack 的 split 会在入账时就把钱按比例分给子账户，
    // 不必等结算后再人工划账 —— 这是「利润进我们自己的支付系统」最省事的做法。
    const useGatewaySplit = cfg.splitEnabled && !!cfg.paystackSplitCode;
    const body: Record<string, unknown> = {
      email: input.customer.email,
      amount: amountMinor,
      currency,
      reference,
      callback_url: `${publicBaseUrl()}/shop/confirmation?order=${encodeURIComponent(reference)}`,
      metadata: {
        orderNo: reference,
        customerName: input.customer.name,
        phone: input.customer.phone || "",
        countryCode: input.countryCode || "",
        amountUsd,
        splitMode: useGatewaySplit ? "gateway" : "ledger",
      },
    };
    if (useGatewaySplit) body.split_code = cfg.paystackSplitCode;

    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const j: any = await res.json();
      if (!j?.status || !j?.data?.authorization_url) {
        return manualFallback(
          provider,
          reference,
          amountUsd,
          j?.message || "Paystack 初始化失败"
        );
      }
      return {
        ok: true,
        provider,
        mode: "redirect",
        url: j.data.authorization_url,
        reference,
        amountUsd,
        charge: { currency, amount: Math.round(amountUsd * rate * 100) / 100 },
        split: splitInfo(
          cfg,
          useGatewaySplit,
          useGatewaySplit
            ? `已在网关侧按 split ${cfg.paystackSplitCode} 自动分账`
            : "未配置 Paystack 分账代码 → 由我方台账分账"
        ),
      };
    } catch (e) {
      return manualFallback(provider, reference, amountUsd, e instanceof Error ? e.message : String(e));
    }
  }

  // ---------------- Flutterwave ----------------
  const currency = (cfg.currency || "USD").toUpperCase();
  const rate = fxRate(currency);
  if (!rate) {
    return manualFallback(provider, reference, amountUsd, `Flutterwave 未配置汇率 PAY_FX_${currency}`);
  }
  if (!cfg.flutterwaveSecretKey) {
    return manualFallback(provider, reference, amountUsd, "Flutterwave 密钥未配置。");
  }

  const subs = cfg.splitEnabled ? parseFlutterwaveSubaccounts(cfg.flutterwaveSubaccounts) : [];
  const body: Record<string, unknown> = {
    tx_ref: reference,
    amount: Math.round(amountUsd * rate * 100) / 100,
    currency,
    redirect_url: `${publicBaseUrl()}/shop/confirmation?order=${encodeURIComponent(reference)}`,
    customer: {
      email: input.customer.email,
      phonenumber: input.customer.phone || "",
      name: input.customer.name,
    },
    customizations: { title: "SZSPD", description: `Order ${reference}` },
  };
  if (subs.length) {
    // transaction_split_ratio 是"分给子账户的百分比"（0~100）
    body.subaccounts = subs.map((s) => ({
      id: s.id,
      transaction_split_ratio: Math.round(s.ratio * 100),
    }));
  }

  try {
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.flutterwaveSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j: any = await res.json();
    if (j?.status !== "success" || !j?.data?.link) {
      return manualFallback(provider, reference, amountUsd, j?.message || "Flutterwave 初始化失败");
    }
    return {
      ok: true,
      provider,
      mode: "redirect",
      url: j.data.link,
      reference,
      amountUsd,
      charge: { currency, amount: Math.round(amountUsd * rate * 100) / 100 },
      split: splitInfo(
        cfg,
        subs.length > 0,
        subs.length ? `已在网关侧按 ${subs.length} 个子账户自动分账` : "未配置子账户 → 由我方台账分账"
      ),
    };
  } catch (e) {
    return manualFallback(provider, reference, amountUsd, e instanceof Error ? e.message : String(e));
  }
}

// ---------------------------------------------------------------------------
// 支付回调校验（务必校验，否则任何人都能伪造"已付款"）
// ---------------------------------------------------------------------------

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Paystack：x-paystack-signature = HMAC-SHA512(rawBody, secretKey) */
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = loadPayConfig().paystackSecretKey;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

/** Flutterwave：请求头 verif-hash 必须等于后台配置的 secret hash */
export function verifyFlutterwaveSignature(header: string | null): boolean {
  const expected = loadPayConfig().flutterwaveSecretHash;
  if (!expected || !header) return false;
  return safeEqual(expected, header);
}
