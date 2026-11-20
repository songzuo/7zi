const { getRequestConfig } = require('next-intl/server');

module.exports = getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale || 'zh';
  
  return {
    locale,
    messages: require('./messages/' + locale + '.json')
  };
});
