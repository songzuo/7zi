/**
 * Mock for nodemailer
 * Used in tests to avoid requiring the actual nodemailer package
 */

export interface MockTransporter {
  sendMail: (options: any) => Promise<{ messageId: string }>
  verify: () => Promise<boolean>
  close: () => void
}

export function createTransport(config: any): MockTransporter {
  return {
    sendMail: async (options: any) => {
      console.log('[Mock Nodemailer] Sending email:', options.subject)
      return { messageId: `mock-${Date.now()}` }
    },
    verify: async () => {
      console.log('[Mock Nodemailer] Verifying connection')
      return true
    },
    close: () => {
      console.log('[Mock Nodemailer] Closing connection')
    },
  }
}

export default {
  createTransport,
}
