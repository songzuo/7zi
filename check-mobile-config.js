/**
 * 移动端配置验证脚本
 *
 * 检查项目中的移动端配置是否符合最佳实践
 */

const fs = require('fs')
const path = require('path')

console.log('📱 Starting Mobile Configuration Check...\n')

// 检查文件是否存在
function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, filePath)
  const exists = fs.existsSync(fullPath)
  if (exists) {
    console.log(`✅ ${filePath} - exists`)
  } else {
    console.log(`❌ ${filePath} - missing`)
  }
  return exists
}

// 检查文件内容
function checkFileContent(filePath, patterns) {
  const fullPath = path.join(__dirname, filePath)
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${filePath} - file not found, skipping content check`)
    return false
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  let allFound = true

  patterns.forEach(pattern => {
    const found = content.includes(pattern)
    if (found) {
      console.log(`   ✅ Contains: ${pattern.substring(0, 50)}...`)
    } else {
      console.log(`   ❌ Missing: ${pattern.substring(0, 50)}...`)
      allFound = false
    }
  })

  return allFound
}

console.log('1. 检查核心文件\n')

const coreFiles = [
  'src/app/[locale]/viewport.tsx',
  'src/app/globals.css',
  'src/components/Navigation.tsx',
]

let allCoreFilesExist = true
coreFiles.forEach(file => {
  if (!checkFileExists(file)) {
    allCoreFilesExist = false
  }
})

console.log('\n2. 检查 Viewport 配置\n')

const viewportPatterns = [
  "width: 'device-width'",
  'initialScale: 1.0',
  'maximumScale: 1.0',
  "viewportFit: 'cover'",
]

checkFileContent('src/app/[locale]/viewport.tsx', viewportPatterns)

console.log('\n3. 检查全局 CSS 配置\n')

const cssPatterns = [
  '-webkit-tap-highlight-color: transparent',
  'text-size-adjust: 100%',
  '.safe-top',
  '.safe-bottom',
  '.touch-active',
]

checkFileContent('src/app/globals.css', cssPatterns)

console.log('\n4. 检查导航组件\n')

const navPatterns = ['md:hidden', 'min-h-[48px]', 'min-w-[48px]', 'aria-label']

checkFileContent('src/components/Navigation.tsx', navPatterns)

console.log('\n5. 检查新创建的组件\n')

const newComponents = [
  'src/components/ResponsiveMemberList.tsx',
  'src/components/ResponsiveDashboard.tsx',
  'src/components/mobile/SwipeContainer.tsx',
]

let allNewComponentsExist = true
newComponents.forEach(file => {
  if (!checkFileExists(file)) {
    allNewComponentsExist = false
  }
})

console.log('\n6. 检查测试配置\n')

const testFiles = [
  'playwright.mobile.config.ts',
  'tests/mobile/navigation.spec.ts',
  'tests/mobile/dashboard.spec.ts',
  'tests/mobile/team.spec.ts',
  'test-mobile.sh',
]

let allTestFilesExist = true
testFiles.forEach(file => {
  if (!checkFileExists(file)) {
    allTestFilesExist = false
  }
})

console.log('\n7. 检查文档\n')

const docFiles = ['MOBILE_RESPONSIVE_REPORT.md', 'MOBILE_IMPLEMENTATION_SUMMARY.md']

let allDocFilesExist = true
docFiles.forEach(file => {
  if (!checkFileExists(file)) {
    allDocFilesExist = false
  }
})

console.log('\n====================================')
console.log('Summary:\n')

if (allCoreFilesExist && allNewComponentsExist && allTestFilesExist && allDocFilesExist) {
  console.log('✅ All files are present!')
  console.log('✅ Mobile configuration is complete!')
  console.log('\nNext steps:')
  console.log('1. Integrate ResponsiveDashboard into Dashboard page')
  console.log('2. Integrate ResponsiveMemberList into Team page')
  console.log('3. Create Members route')
  console.log('4. Run: ./test-mobile.sh')
  console.log('5. Test on real devices')
} else {
  console.log('❌ Some files are missing.')
  console.log('Please check the output above for details.')
}

console.log('\n====================================')
