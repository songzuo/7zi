const fs = require('fs')
const path = require('path')

const i18nDir = path.join(__dirname, 'i18n/messages')

// Load files
const ko = JSON.parse(fs.readFileSync(path.join(i18nDir, 'ko.json'), 'utf8'))
const es = JSON.parse(fs.readFileSync(path.join(i18nDir, 'es.json'), 'utf8'))
const ja = JSON.parse(fs.readFileSync(path.join(i18nDir, 'ja.json'), 'utf8'))

let fixes = {
  ko: [],
  es: [],
  ja: [],
}

// ========== FIX KOREAN ==========
console.log('=== Fixing Korean (ko.json) ===\n')

// Fix: home.services.web.description - Japanese text
if (ko.home.services.web.description.includes('高性能な現代')) {
  ko.home.services.web.description = ko.home.services.web.description.replace(
    '高性能な現代ウェブサイトとウェブアプリケーション構築',
    '고성능의 현대적인 웹사이트와 웹 애플리케이션 구축'
  )
  fixes.ko.push('home.services.web.description - Replaced Japanese with Korean')
}

// Fix: home.whyUs.iteration.description - Chinese text
if (ko.home.whyUs.iteration.description.includes('不断完善')) {
  ko.home.whyUs.iteration.description = ko.home.whyUs.iteration.description.replace(
    '不断完善',
    '지속적으로 개선'
  )
  fixes.ko.push('home.whyUs.iteration.description - Replaced Chinese with Korean')
}

// Fix: team.members.designer.description - Japanese text
if (ko.team.members.designer.description.includes('を作成し')) {
  ko.team.members.designer.description =
    '아름답고 사용자 친화적인 인터페이스를 만들어 우수한 사용자 경험 디자인을 제공합니다.'
  fixes.ko.push('team.members.designer.description - Replaced Japanese with Korean')
}

// Fix: about.intro.p1 - Missing "7zi Studio" at beginning
if (ko.about.intro.p1 && !ko.about.intro.p1.startsWith('7zi Studio는')) {
  ko.about.intro.p1 = '7zi Studio는' + ko.about.intro.p1
  fixes.ko.push('about.intro.p1 - Added missing "7zi Studio" prefix')
}

// Fix: about.intro.p2 - Japanese text
if (ko.about.intro.p2 && ko.about.intro.p2.includes('AIメンバー')) {
  ko.about.intro.p2 = ko.about.intro.p2.replace(/AIメンバー/g, 'AI 멤버')
  fixes.ko.push('about.intro.p2 - Replaced Japanese "AIメンバー" with Korean')
}

// Fix: about.timeline - All English
if (ko.about.timeline && ko.about.timeline.badge === 'Our Journey') {
  ko.about.timeline.badge = '여정'
  fixes.ko.push('about.timeline.badge - Translated from English to Korean')
}
if (ko.about.timeline && ko.about.timeline.title === 'Our Growth Trajectory') {
  ko.about.timeline.title = '성장 궤적'
  fixes.ko.push('about.timeline.title - Translated from English to Korean')
}
if (
  ko.about.timeline &&
  ko.about.timeline.description === 'From startup to growth, every step forward with our clients'
) {
  ko.about.timeline.description = '스타트업에서 성장까지, 고객과 함께하는 모든 전진의 발걸음'
  fixes.ko.push('about.timeline.description - Translated from English to Korean')
}

// Fix: about.partners - All English
if (ko.about.partners && ko.about.partners.badge === 'Partners') {
  ko.about.partners.badge = '파트너'
  fixes.ko.push('about.partners.badge - Translated from English to Korean')
}
if (
  ko.about.partners &&
  ko.about.partners.count === '{count} companies have chosen to work with us'
) {
  ko.about.partners.count = '{count}개 기업이 우리와 협력하기로 선택했습니다'
  fixes.ko.push('about.partners.count - Translated from English to Korean')
}

// Fix: about.values - All English
if (ko.about.values && ko.about.values.badge === 'Core Values') {
  ko.about.values.badge = '핵심 가치'
  fixes.ko.push('about.values.badge - Translated from English to Korean')
}
if (ko.about.values && ko.about.values.title === 'Our Philosophy') {
  ko.about.values.title = '우리의 철학'
  fixes.ko.push('about.values.title - Translated from English to Korean')
}

// Fix: about.process - All English
if (ko.about.process && ko.about.process.badge === 'Workflow') {
  ko.about.process.badge = '워크플로우'
  fixes.ko.push('about.process.badge - Translated from English to Korean')
}
if (ko.about.process && ko.about.process.title === 'How We Work') {
  ko.about.process.title = '우리의 작업 방식'
  fixes.ko.push('about.process.title - Translated from English to Korean')
}

// Fix: about.cta - All English
if (ko.about.cta && ko.about.cta.title === 'Ready to Work With Us?') {
  ko.about.cta.title = '우리와 함께 일할 준비가 되셨나요?'
  fixes.ko.push('about.cta.title - Translated from English to Korean')
}
if (
  ko.about.cta &&
  ko.about.cta.description ===
    "Let's build your digital project together and create infinite possibilities"
) {
  ko.about.cta.description = '함께 디지털 프로젝트를 구축하고 무한한 가능성을 만들어 보세요'
  fixes.ko.push('about.cta.description - Translated from English to Korean')
}
if (ko.about.cta && ko.about.cta.button === 'Contact Us') {
  ko.about.cta.button = '문의하기'
  fixes.ko.push('about.cta.button - Translated from English to Korean')
}

// Fix: contact.cta - "迷hybrid"
if (ko.contact.cta && ko.contact.cta.title.includes('迷hybrid')) {
  ko.contact.cta.title = '아직 망설이고 계신가요?'
  fixes.ko.push('contact.cta.title - Fixed "迷hybrid" corruption')
}

// Fix: errors.unauthorized.solution - English
if (ko.errors.unauthorized && ko.errors.unauthorized.solution.includes('Please sign in')) {
  ko.errors.unauthorized.solution = '계속하려면 로그인하세요. 오류라고 생각되면 지원에 문의하세요.'
  fixes.ko.push('errors.unauthorized.solution - Translated from English to Korean')
}

// Fix: errors.forbidden.solution - Extra space
if (
  ko.errors.forbidden &&
  ko.errors.forbidden.solution &&
  ko.errors.forbidden.solution.startsWith(' ')
) {
  ko.errors.forbidden.solution = ko.errors.forbidden.solution.trim()
  fixes.ko.push('errors.forbidden.solution - Removed leading space')
}

// Fix: about.intro.stats - All English
if (ko.about.intro && ko.about.intro.stats) {
  if (ko.about.intro.stats.experts.label === 'AI Experts') {
    ko.about.intro.stats.experts.label = 'AI 전문가'
    fixes.ko.push('about.intro.stats.experts.label - Translated from English to Korean')
  }
  if (ko.about.intro.stats.experts.sub === 'Each Specialized') {
    ko.about.intro.stats.experts.sub = '각각 전문화'
    fixes.ko.push('about.intro.stats.experts.sub - Translated from English to Korean')
  }
  if (ko.about.intro.stats.projects.label === 'Completed Projects') {
    ko.about.intro.stats.projects.label = '완료된 프로젝트'
    fixes.ko.push('about.intro.stats.projects.label - Translated from English to Korean')
  }
  if (ko.about.intro.stats.projects.sub === 'Client Satisfaction') {
    ko.about.intro.stats.projects.sub = '고객 만족'
    fixes.ko.push('about.intro.stats.projects.sub - Translated from English to Korean')
  }
  if (ko.about.intro.stats.delivery.label === 'Delivery Rate') {
    ko.about.intro.stats.delivery.label = '납품률'
    fixes.ko.push('about.intro.stats.delivery.label - Translated from English to Korean')
  }
  if (ko.about.intro.stats.delivery.sub === 'On-Time Delivery') {
    ko.about.intro.stats.delivery.sub = '기한 준수'
    fixes.ko.push('about.intro.stats.delivery.sub - Translated from English to Korean')
  }
  if (ko.about.intro.stats.support.label === 'Online Support') {
    ko.about.intro.stats.support.label = '온라인 지원'
    fixes.ko.push('about.intro.stats.support.label - Translated from English to Korean')
  }
  if (ko.about.intro.stats.support.sub === 'Always Responsive') {
    ko.about.intro.stats.support.sub = '항상 응답'
    fixes.ko.push('about.intro.stats.support.sub - Translated from English to Korean')
  }
}

// Fix: about.values.items.innovation.title - "驱动" mixed
if (
  ko.about.values &&
  ko.about.values.items &&
  ko.about.values.items.innovation.title === '혁신驱动'
) {
  ko.about.values.items.innovation.title = '혁신 주도'
  fixes.ko.push('about.values.items.innovation.title - Fixed mixed "혁신驱动" to "혁신 주도"')
}

// Fix: footer.aiPowered - "驱动" mixed
if (ko.footer && ko.footer.aiPowered.includes('驱动')) {
  ko.footer.aiPowered = 'AI 에이전트 팀 주도 · 무한한 혁신'
  fixes.ko.push('footer.aiPowered - Fixed mixed "驱动" to Korean')
}

// ========== FIX SPANISH ==========
console.log('\n=== Fixing Spanish (es.json) ===\n')

// Fix: home.hero.cta1 - Chinese text
if (es.home.hero.cta1 === '了解更多') {
  es.home.hero.cta1 = 'Aprende Más'
  fixes.es.push('home.hero.cta1 - Replaced Chinese "了解更多" with Spanish "Aprende Más"')
}

// Fix: about.intro.p3 - English
if (es.about.intro.p3 && es.about.intro.p3.includes("Whether it's")) {
  es.about.intro.p3 =
    'Ya sea desarrollo web, diseño de marca, optimización SEO o marketing de contenidos, 7zi Studio le ofrece soluciones digitales integrales.'
  fixes.es.push('about.intro.p3 - Translated from English to Spanish')
}

// Fix: about.intro.stats - All English
if (es.about.intro && es.about.intro.stats) {
  if (es.about.intro.stats.experts.label === 'AI Experts') {
    es.about.intro.stats.experts.label = 'Expertos en IA'
    fixes.es.push('about.intro.stats.experts.label - Translated from English to Spanish')
  }
  if (es.about.intro.stats.experts.sub === 'Each Specialized') {
    es.about.intro.stats.experts.sub = 'Cada uno Especializado'
    fixes.es.push('about.intro.stats.experts.sub - Translated from English to Spanish')
  }
  if (es.about.intro.stats.projects.label === 'Completed Projects') {
    es.about.intro.stats.projects.label = 'Proyectos Completados'
    fixes.es.push('about.intro.stats.projects.label - Translated from English to Spanish')
  }
  if (es.about.intro.stats.projects.sub === 'Client Satisfaction') {
    es.about.intro.stats.projects.sub = 'Satisfacción del Cliente'
    fixes.es.push('about.intro.stats.projects.sub - Translated from English to Spanish')
  }
  if (es.about.intro.stats.delivery.label === 'Delivery Rate') {
    es.about.intro.stats.delivery.label = 'Tasa de Entrega'
    fixes.es.push('about.intro.stats.delivery.label - Translated from English to Spanish')
  }
  if (es.about.intro.stats.delivery.sub === 'On-Time Delivery') {
    es.about.intro.stats.delivery.sub = 'Entrega a Tiempo'
    fixes.es.push('about.intro.stats.delivery.sub - Translated from English to Spanish')
  }
  if (es.about.intro.stats.support.label === 'Online Support') {
    es.about.intro.stats.support.label = 'Soporte en Línea'
    fixes.es.push('about.intro.stats.support.label - Translated from English to Spanish')
  }
  if (es.about.intro.stats.support.sub === 'Always Responsive') {
    es.about.intro.stats.support.sub = 'Siempre Responsivo'
    fixes.es.push('about.intro.stats.support.sub - Translated from English to Spanish')
  }
}

// Fix: about.timeline - All English
if (es.about.timeline && es.about.timeline.badge === 'Our Journey') {
  es.about.timeline.badge = 'Nuestro Viaje'
  fixes.es.push('about.timeline.badge - Translated from English to Spanish')
}
if (es.about.timeline && es.about.timeline.title === 'Our Growth Trajectory') {
  es.about.timeline.title = 'Nuestra Trayectoria de Crecimiento'
  fixes.es.push('about.timeline.title - Translated from English to Spanish')
}
if (
  es.about.timeline &&
  es.about.timeline.description === 'From startup to growth, every step forward with our clients'
) {
  es.about.timeline.description =
    'Desde el inicio hasta el crecimiento, cada paso adelante con nuestros clientes'
  fixes.es.push('about.timeline.description - Translated from English to Spanish')
}

// Fix: about.partners - All English
if (es.about.partners && es.about.partners.badge === 'Partners') {
  es.about.partners.badge = 'Socios'
  fixes.es.push('about.partners.badge - Translated from English to Spanish')
}
if (
  es.about.partners &&
  es.about.partners.count === '{count} companies have chosen to work with us'
) {
  es.about.partners.count = '{count} empresas han elegido trabajar con nosotros'
  fixes.es.push('about.partners.count - Translated from English to Spanish')
}

// Fix: about.values - All English
if (es.about.values && es.about.values.badge === 'Core Values') {
  es.about.values.badge = 'Valores Fundamentales'
  fixes.es.push('about.values.badge - Translated from English to Spanish')
}
if (es.about.values && es.about.values.title === 'Our Philosophy') {
  es.about.values.title = 'Nuestra Filosofía'
  fixes.es.push('about.values.title - Translated from English to Spanish')
}

// Fix: about.process - All English
if (es.about.process && es.about.process.badge === 'Workflow') {
  es.about.process.badge = 'Flujo de Trabajo'
  fixes.es.push('about.process.badge - Translated from English to Spanish')
}
if (es.about.process && es.about.process.title === 'How We Work') {
  es.about.process.title = 'Cómo Trabajamos'
  fixes.es.push('about.process.title - Translated from English to Spanish')
}

// Fix: about.cta - All English
if (es.about.cta && es.about.cta.title === 'Ready to Work With Us?') {
  es.about.cta.title = '¿Listo para Trabajar con Nosotros?'
  fixes.es.push('about.cta.title - Translated from English to Spanish')
}
if (
  es.about.cta &&
  es.about.cta.description ===
    "Let's build your digital project together and create infinite possibilities"
) {
  es.about.cta.description =
    'Construyamos juntos tu proyecto digital y creemos posibilidades infinitas'
  fixes.es.push('about.cta.description - Translated from English to Spanish')
}
if (es.about.cta && es.about.cta.button === 'Contact Us') {
  es.about.cta.button = 'Contáctenos'
  fixes.es.push('about.cta.button - Translated from English to Spanish')
}

// Fix: errors.unauthorized.solution - English "Please sign in"
if (es.errors.unauthorized && es.errors.unauthorized.solution.includes('Please sign in')) {
  es.errors.unauthorized.solution =
    'Por favor inicie sesión para continuar, o contacte soporte si cree que esto es un error.'
  fixes.es.push('errors.unauthorized.solution - Translated from English to Spanish')
}

// Fix: team.members.designer.description - English missing translation
if (
  es.team.members.designer.description ===
  'Creates beautiful and user-friendly interfaces, providing excellent user experience design.'
) {
  es.team.members.designer.description =
    'Crea interfaces hermosas y fáciles de usar, proporcionando excelente diseño de experiencia de usuario.'
  fixes.es.push('team.members.designer.description - Translated from English to Spanish')
}

// Fix: contact.hero.description - English "We're always ready to serve you"
if (es.contact.hero.description && es.contact.hero.description.includes("We're always ready")) {
  es.contact.hero.description =
    '¿Tienes preguntas o ideas de colaboración? Siempre estamos listos para servirte'
  fixes.es.push('contact.hero.description - Translated from English to Spanish')
}

// Fix: errors.general.support - English "If the problem continues, please contact"
if (
  es.errors.general &&
  es.errors.general.support &&
  es.errors.general.support.includes('If the problem continues')
) {
  es.errors.general.support = 'Si el problema continúa, por favor contacta'
  fixes.es.push('errors.general.support - Translated from English to Spanish')
}

// ========== FIX JAPANESE ==========
console.log('\n=== Fixing Japanese (ja.json) ===\n')

// Fix: about.intro.p1 - Missing "7zi Studio"
if (ja.about.intro.p1.startsWith('は革新的な')) {
  ja.about.intro.p1 =
    '7zi Studioは革新的なデジタルスタジオです。チームの概念を再定義しました — 11の専門的なAIエージェントから成り、各々が専門性を活用してさまざまなデジタルプロジェクトを協力的に完了させます。'
  fixes.ja.push('about.intro.p1 - Added missing "7zi Studio" prefix')
}

// Fix: about.hero.description - "24時間年中无公害" (Chinese mixed)
if (ja.about.hero.description.includes('年中无公害')) {
  ja.about.hero.description =
    'チームコラボレーションを再定義 — 11のAIエージェントによるインテリジェントチーム、24時間365日でデジタル価値を創出'
  fixes.ja.push('about.hero.description - Fixed "24時間年中无公害" to "24時間365日"')
}

// Fix: contact.hero.description - "おありますか?" (weird grammar)
if (ja.contact.hero.description.includes('おありますか')) {
  ja.contact.hero.description =
    'ご質問やパートナーシップのご提案はおありですか？常時ご対応いたします'
  fixes.ja.push('contact.hero.description - Fixed grammar from "おありますか?" to "おありですか?"')
}

// Fix: errors.unauthorized.solution - English "Please sign in"
if (ja.errors.unauthorized && ja.errors.unauthorized.solution.includes('Please sign in')) {
  ja.errors.unauthorized.solution =
    '続行するにはサインインするか、エラーと思われる場合はサポートまでご連絡ください。'
  fixes.ja.push('errors.unauthorized.solution - Translated from English to Japanese')
}

// Fix: errors.general.support - English "If the problem continues, please contact"
if (
  ja.errors.general &&
  ja.errors.general.support &&
  ja.errors.general.support.includes('If the problem continues')
) {
  ja.errors.general.support = '問題が続く場合は、こちらまでご連絡ください：'
  fixes.ja.push('errors.general.support - Translated from English to Japanese')
}

// Save files
console.log('\n=== Saving Files ===\n')

fs.writeFileSync(path.join(i18nDir, 'ko.json'), JSON.stringify(ko, null, 2), 'utf8')
console.log('✓ Saved ko.json')

fs.writeFileSync(path.join(i18nDir, 'es.json'), JSON.stringify(es, null, 2), 'utf8')
console.log('✓ Saved es.json')

fs.writeFileSync(path.join(i18nDir, 'ja.json'), JSON.stringify(ja, null, 2), 'utf8')
console.log('✓ Saved ja.json')

// Print summary
console.log('\n=== SUMMARY ===\n')

console.log(`Korean (ko.json): ${fixes.ko.length} fixes`)
fixes.ko.forEach(fix => console.log(`  - ${fix}`))

console.log(`\nSpanish (es.json): ${fixes.es.length} fixes`)
fixes.es.forEach(fix => console.log(`  - ${fix}`))

console.log(`\nJapanese (ja.json): ${fixes.ja.length} fixes`)
fixes.ja.forEach(fix => console.log(`  - ${fix}`))

console.log(`\n=== TOTAL: ${fixes.ko.length + fixes.es.length + fixes.ja.length} fixes ===\n`)
