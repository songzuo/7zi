const fs = require('fs');
const path = require('path');

// 翻译映射表（基础UI元素）
const translations = {
  ja: {
    common: {
      siteName: "7zi Studio",
      siteNameShort: "7ziStudio",
      tagline: "AI駆動の革新的デジタルスタジオ",
      taglineShort: "AI駆動スタジオ",
      logo: "7ziStudio"
    },
    nav: {
      home: "ホーム",
      about: "私たちについて",
      team: "チームメンバー",
      blog: "ブログ",
      portfolio: "実績",
      dashboard: "ダッシュボード",
      contact: "お問い合わせ",
      global: "7zi グローバル"
    },
    home: {
      title: "ホーム - AI駆動の革新的デジタルスタジオ",
      description: "7zi Studioは11人の専門AIエージェントから成り、ウェブ開発、ブランドデザイン、マーケティングなどの包括的なデジタルサービスを提供します。効率的、専門的、革新的で、優れたデジタル製品の構築を支援します。",
      hero: {
        badge: "AI駆動の革新的デジタルスタジオ",
        badgeShort: "AI駆動スタジオ",
        title1: "AIで再定義する",
        title2: "チーム協力",
        title1Prefix: "AIでチーム協力を再定義",
        description: "7zi Studioは11人の専門AIエージェントから成り、戦略計画から製品提供まで、包括的なデジタルソリューションを提供します。",
        cta1: "詳細を見る",
        cta2: "チームメンバー",
        stats: {
          experts: {
            value: "11+",
            label: "AI専門家"
          },
          service: {
            value: "24/7",
            label: "オンラインサービス"
          },
          delivery: {
            value: "100%",
            label: "プロジェクト完了"
          }
        }
      },
      teamPreview: {
        title: "11人のAI専門家があなたをサポート",
        description: "私たちのチームは戦略、技術、運営の全分野をカバーし、各プロジェクトには専門的なAIメンバーが担当します",
        viewTeam: "完全なチームを見る"
      }
    },
    team: {
      title: "チームメンバー - 7zi Studio",
      description: "11人の専門AIエージェントから成る私たちのチームをご紹介します。戦略、技術、運営など、各分域の専門家があなたをサポートします。"
    },
    about: {
      title: "私たちについて - 7zi Studio",
      description: "7zi Studioは11人のAIエージェントから成る革新的なデジタルスタジオです。私たちの使命、価値観、発展の歴史をご紹介します。"
    },
    contact: {
      title: "お問い合わせ - 7zi Studio",
      description: "お問い合わせをお待ちしています。ウェブ開発、ブランドデザイン、マーケティングなど、どんなデジタルプロジェクトでもお気軽にご相談ください。"
    },
    footer: {
      quickLinks: "クイックリンク",
      services: "サービス",
      contactUs: "お問い合わせ",
      privacy: "プライバシーポリシー",
      terms: "利用規約",
      cookies: "Cookieポリシー",
      allRightsReserved: "すべての権利を保有"
    }
  },
  ko: {
    common: {
      siteName: "7zi Studio",
      siteNameShort: "7ziStudio",
      tagline: "AI 기반 혁신 디지털 스튜디오",
      taglineShort: "AI 기반 스튜디오",
      logo: "7ziStudio"
    },
    nav: {
      home: "홈",
      about: "소개",
      team: "팀원",
      blog: "블로그",
      portfolio: "포트폴리오",
      dashboard: "대시보드",
      contact: "연락처",
      global: "7zi 글로벌"
    },
    home: {
      title: "홈 - AI 기반 혁신 디지털 스튜디오",
      description: "7zi Studio는 11명의 전문 AI 에이전트로 구성되어 웹 개발, 브랜드 디자인, 마케팅 등 포괄적인 디지털 서비스를 제공합니다. 효율적, 전문적, 혁신적으로 뛰어난 디지털 제품 구축을 지원합니다.",
      hero: {
        badge: "AI 기반 혁신 디지털 스튜디오",
        badgeShort: "AI 기반 스튜디오",
        title1: "AI로 재정의하는",
        title2: "팀 협업",
        title1Prefix: "AI로 팀 협업 재정의",
        description: "7zi Studio는 11명의 전문 AI 에이전트로 구성되어 전략 계획부터 제품 출시까지 포괄적인 디지털 솔루션을 제공합니다.",
        cta1: "자세히 보기",
        cta2: "팀원",
        stats: {
          experts: {
            value: "11+",
            label: "AI 전문가"
          },
          service: {
            value: "24/7",
            label: "온라인 서비스"
          },
          delivery: {
            value: "100%",
            label: "프로젝트 완료"
          }
        }
      },
      teamPreview: {
        title: "11명의 AI 전문가가 서비스합니다",
        description: "저희 팀은 전략, 기술, 운영 전 분야를 아우르며 각 프로젝트는 전문적인 AI 멤버가 담당합니다",
        viewTeam: "전체 팀 보기"
      }
    },
    team: {
      title: "팀원 - 7zi Studio",
      description: "11명의 전문 AI 에이전트로 구성된 저희 팀을 소개합니다. 전략, 기술, 운영 등 각 분야의 전문가가 서비스합니다."
    },
    about: {
      title: "소개 - 7zi Studio",
      description: "7zi Studio는 11명의 AI 에이전트로 구성된 혁신적인 디지털 스튜디오입니다. 저희의 사명, 가치, 발전 역사를 소개합니다."
    },
    contact: {
      title: "연락처 - 7zi Studio",
      description: "문의해 주세요. 웹 개발, 브랜드 디자인, 마케팅 등 모든 디지털 프로젝트에 대해 자유롭게 문의하세요."
    },
    footer: {
      quickLinks: "빠른 링크",
      services: "서비스",
      contactUs: "연락처",
      privacy: "개인정보처리방침",
      terms: "이용약관",
      cookies: "쿠키 정책",
      allRightsReserved: "모든 권리 보유"
    }
  },
  es: {
    common: {
      siteName: "7zi Studio",
      siteNameShort: "7ziStudio",
      tagline: "Estudio Digital de Innovación Impulsado por IA",
      taglineShort: "Estudio Impulsado por IA",
      logo: "7ziStudio"
    },
    nav: {
      home: "Inicio",
      about: "Nosotros",
      team: "Equipo",
      blog: "Blog",
      portfolio: "Portafolio",
      dashboard: "Panel",
      contact: "Contacto",
      global: "7zi Global"
    },
    home: {
      title: "Inicio - Estudio Digital de Innovación Impulsado por IA",
      description: "7zi Studio está compuesto por 11 agentes de IA profesionales, ofreciendo servicios digitales integrales que incluyen desarrollo web, diseño de marca, marketing y más. Eficiente, profesional e innovador, le ayudamos a crear excelentes productos digitales.",
      hero: {
        badge: "Estudio Digital de Innovación Impulsado por IA",
        badgeShort: "Estudio Impulsado por IA",
        title1: "Redefiniendo",
        title2: "Colaboración en Equipo",
        title1Prefix: "Redefiniendo la colaboración en equipo con IA",
        description: "7zi Studio está compuesto por 11 agentes de IA profesionales, ofreciendo soluciones digitales integrales desde la planificación estratégica hasta la entrega del producto.",
        cta1: "Más Información",
        cta2: "Miembros del Equipo",
        stats: {
          experts: {
            value: "11+",
            label: "Expertos en IA"
          },
          service: {
            value: "24/7",
            label: "Servicio en Línea"
          },
          delivery: {
            value: "100%",
            label: "Proyectos Completados"
          }
        }
      },
      teamPreview: {
        title: "11 Expertos en IA a su Servicio",
        description: "Nuestro equipo cubre todas las áreas: estrategia, tecnología y operaciones, y cada proyecto cuenta con un miembro de IA especializado responsable.",
        viewTeam: "Ver Equipo Completo"
      }
    },
    team: {
      title: "Equipo - 7zi Studio",
      description: "Presentamos a nuestro equipo de 11 agentes de IA profesionales. Expertos en estrategia, tecnología, operaciones y más, aquí para servirle."
    },
    about: {
      title: "Nosotros - 7zi Studio",
      description: "7zi Studio es un estudio digital innovador compuesto por 11 agentes de IA. Presentamos nuestra misión, valores e historia de desarrollo."
    },
    contact: {
      title: "Contacto - 7zi Studio",
      description: "Estamos aquí para ayudarle. Contáctenos para cualquier proyecto digital, ya sea desarrollo web, diseño de marca, marketing o más."
    },
    footer: {
      quickLinks: "Enlaces Rápidos",
      services: "Servicios",
      contactUs: "Contáctenos",
      privacy: "Política de Privacidad",
      terms: "Términos de Servicio",
      cookies: "Política de Cookies",
      allRightsReserved: "Todos los derechos reservados"
    }
  }
};

// 更新翻译文件
function updateTranslationFile(locale, translationsForLocale) {
  const filePath = path.join(__dirname, '../src/i18n/messages', `${locale}.json`);

  // 读取现有文件
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 递归合并翻译
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        Object.assign(source[key], deepMerge(target[key], source[key]));
      }
    }
    Object.assign(target || {}, source);
    return target;
  }

  // 合并翻译
  const merged = deepMerge(existing, translationsForLocale);

  // 写回文件
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`✅ ${locale}.json 更新完成`);
}

// 更新所有语言
console.log('开始更新翻译文件...\n');
updateTranslationFile('ja', translations.ja);
updateTranslationFile('ko', translations.ko);
updateTranslationFile('es', translations.es);

console.log('\n✅ 所有翻译文件更新完成！');
console.log('\n已翻译的命名空间:');
Object.keys(translations.ja).forEach(ns => console.log(`  - ${ns}`));
