'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';

interface HarvestMeta {
  lastSyncAt: string | null;
  lastSyncOk: boolean;
  lastError: string | null;
  pointsUsed: number;
  pointsRemaining: number | null;
  harvestCursor: string | null;
  mode: string;
  totalProducts: number;
  visibleProducts: number;
}

interface FunnelStats {
  visit: number;
  checkout: number;
  paymentStart: number;
  paymentSuccess: number;
  paymentFail: number;
  conversion: {
    visitToCheckout: number;
    checkoutToPayment: number;
    paymentToSuccess: number;
    visitToSuccess: number;
  } | null;
}

interface CategoryDist {
  name: string;
  skuCount: number;
}

interface CostBand {
  band: string;
  cnt: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface CostAudit {
  totalProducts: number;
  bands: CostBand[];
}

interface DashboardData {
  harvest: HarvestMeta;
  funnel: FunnelStats;
  categories: CategoryDist[];
  cost: CostAudit;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-gray-900">{value}{suffix ? <span className="text-sm font-medium text-gray-400 ml-1">{suffix}</span> : null}</span>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || 'fetch failed');
        setData(j.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading dashboard…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error: {error || 'No data'}</div>
      </div>
    );
  }

  const { harvest, funnel, categories, cost } = data;

  // 漏斗图数据
  const funnelData = [
    { name: 'Visit', value: funnel.visit, fill: '#6366f1' },
    { name: 'Checkout', value: funnel.checkout, fill: '#8b5cf6' },
    { name: 'Payment Start', value: funnel.paymentStart, fill: '#ec4899' },
    { name: 'Payment Success', value: funnel.paymentSuccess, fill: '#10b981' },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">SZSPD Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">全链路数据看板 · 实时刷新</p>
        </div>

        {/* 第一行：收割进度 + 漏斗概览 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card title="Catalog 收割进度">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Stat label="Total Products" value={harvest.totalProducts.toLocaleString()} />
              <Stat label="Visible Products" value={harvest.visibleProducts.toLocaleString()} />
              <Stat label="Points Used" value={harvest.pointsUsed.toLocaleString()} />
              <Stat label="Points Remaining" value={harvest.pointsRemaining ?? '—'} />
            </div>
            <div className="text-xs text-gray-400 border-t pt-3 mt-2">
              Last sync: {harvest.lastSyncAt ? new Date(harvest.lastSyncAt).toLocaleString('zh-CN') : '—'}
              <span className={`ml-2 inline-block h-2 w-2 rounded-full ${harvest.lastSyncOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="ml-1">{harvest.mode}</span>
            </div>
          </Card>

          <Card title="订单漏斗（近 7 天）">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Stat label="Visit" value={funnel.visit} />
              <Stat label="Checkout" value={funnel.checkout} />
              <Stat label="Payment Start" value={funnel.paymentStart} />
              <Stat label="Payment Success" value={funnel.paymentSuccess} />
            </div>
            {funnel.conversion && (
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 border-t pt-3 mt-2">
                <div>Visit→Checkout: <span className="font-semibold text-indigo-600">{funnel.conversion.visitToCheckout}%</span></div>
                <div>Checkout→Payment: <span className="font-semibold text-indigo-600">{funnel.conversion.checkoutToPayment}%</span></div>
                <div>Payment→Success: <span className="font-semibold text-emerald-600">{funnel.conversion.paymentToSuccess}%</span></div>
                <div>Overall: <span className="font-semibold text-emerald-600">{funnel.conversion.visitToSuccess}%</span></div>
              </div>
            )}
          </Card>
        </div>

        {/* 第二行：漏斗图 + 分类分布 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card title="漏斗可视化">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Count']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="商品分类分布（Top 10）">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="skuCount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* 第三行：成本单 + 支付失败 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="成本单 · 价格带分布">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cost.bands}
                    dataKey="cnt"
                    nameKey="band"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(d: any) => `${d.band}: ${d.cnt}`}
                  >
                    {cost.bands.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} SKU`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mt-2 border-t pt-3">
              <div>Total: <span className="font-semibold text-gray-700">{cost.totalProducts}</span></div>
              <div>Avg: <span className="font-semibold text-gray-700">${cost.bands.length > 0 ? (cost.bands.reduce((s, b) => s + b.avgPrice * b.cnt, 0) / cost.totalProducts).toFixed(2) : '—'}</span></div>
              <div>Bands: <span className="font-semibold text-gray-700">{cost.bands.length}</span></div>
            </div>
          </Card>

          <Card title="支付异常监控">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Success', value: funnel.paymentSuccess, fill: '#10b981' },
                  { name: 'Fail', value: funnel.paymentFail, fill: '#f43f5e' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-gray-400 border-t pt-3 mt-2">
              Fail rate: {funnel.paymentStart > 0 ? Math.round((funnel.paymentFail / funnel.paymentStart) * 1000) / 10 : 0}%
              <span className="ml-4">Success / Fail ratio: {funnel.paymentSuccess}:{funnel.paymentFail}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
