module.exports = {
  createTransport: () => ({
    sendMail: () => Promise.resolve({ messageId: 'test' }),
    verify: () => Promise.resolve(true),
  }),
}
