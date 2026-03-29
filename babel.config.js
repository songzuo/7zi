module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      'babel-plugin-react-compiler',
      {
        // React Compiler 配置
        // 默认编译所有组件，除非有 'use no memo' 指令
        target: '19', // React 19 目标
      },
    ],
  ],
};
