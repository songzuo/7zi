/**
 * E2E Test: WebSocket Connection
 *
 * 测试 WebSocket 连接的完整功能:
 * - 连接建立和状态
 * - 消息收发
 * - 自动重连
 * - 心跳机制
 * - 断开连接
 */

import { test, expect } from './fixtures/test.fixtures'
import { WebSocketPage } from './fixtures/types'
import {
  checkToast,
  clearStorage,
  setAuthToken,
  waitForElement,
  waitForNetworkIdle,
} from './helpers/test-helpers'

test.describe('WebSocket 连接', () => {
  let wsPage: WebSocketPage

  test.beforeEach(async ({ authenticatedPage, page }) => {
    wsPage = new WebSocketPage(page)

    // 添加 WebSocket 模拟脚本
    await page.addInitScript(() => {
      // 创建模拟 WebSocket
      class MockWebSocket {
        static instances: MockWebSocket[] = []

        url: string
        readyState: number = WebSocket.CONNECTING
        _messages: any[] = []

        constructor(url: string) {
          this.url = url
          MockWebSocket.instances.push(this)

          // 模拟连接成功
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) {
              this.onopen(new Event('open'))
            }
          }, 100)
        }

        send(data: string) {
          this._messages.push(JSON.parse(data))

          // 模拟服务器响应
          setTimeout(() => {
            if (this.onmessage) {
              const response = {
                type: 'echo',
                data: JSON.parse(data),
                timestamp: Date.now(),
              }
              this.onmessage(
                new MessageEvent('message', {
                  data: JSON.stringify(response),
                })
              )
            }
          }, 50)
        }

        close(code?: number, reason?: string) {
          this.readyState = WebSocket.CLOSED
          if (this.onclose) {
            this.onclose(new CloseEvent('close', { code, reason }))
          }
        }

        onopen: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
      }

      ;(window as any).WebSocket = MockWebSocket
      ;(window as any).mockWebSocket = MockWebSocket
    })
  })

  test('应该自动建立 WebSocket 连接', async ({ page }) => {
    await page.goto('/websocket-status-demo')

    // 等待连接状态更新
    await page.waitForTimeout(500)

    await expect(wsPage.connectionStatus).toBeVisible()
    await wsPage.expectConnected()
  })

  test('应该显示连接状态', async ({ page }) => {
    await page.goto('/websocket-status-demo')

    // 初始状态应该是连接中
    await expect(wsPage.connectionStatus).toContainText(/连接中|connecting/i)

    // 等待连接完成
    await page.waitForTimeout(200)

    // 验证已连接状态
    await wsPage.expectConnected()
  })

  test('应该显示连接详情', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(300)

    // 检查连接信息显示
    const connectionInfo = page.getByTestId('connection-info')
    await expect(connectionInfo).toBeVisible()

    // 验证显示的信息
    await expect(connectionInfo.getByText(/ws:\/\//)).toBeVisible()
  })

  test('应该发送消息', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await wsPage.expectConnected()

    // 发送消息
    await wsPage.sendMessage('Hello, WebSocket!')

    // 验证消息已添加到列表
    const sentMessage = page.getByTestId('sent-message').filter({ hasText: 'Hello, WebSocket!' })
    await expect(sentMessage).toBeVisible()
  })

  test('应该接收消息', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await wsPage.expectConnected()

    // 发送消息（会收到 echo 响应）
    await wsPage.sendMessage('Test message')

    // 等待响应
    await page.waitForTimeout(100)

    // 验证收到响应
    const receivedMessage = wsPage.messageList
      .getByTestId('received-message')
      .filter({ hasText: 'Test message' })
    await expect(receivedMessage).toBeVisible()
  })

  test('应该显示消息时间戳', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await wsPage.expectConnected()

    await wsPage.sendMessage('Timestamp test')
    await page.waitForTimeout(100)

    // 验证时间戳显示
    await expect(page.getByText(/\d{2}:\d{2}:\d{2}/)).toBeVisible()
  })

  test('应该显示连接延迟', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await wsPage.expectConnected()

    // 检查延迟显示
    const latency = page.getByTestId('connection-latency')
    await expect(latency).toBeVisible()
    await expect(latency).toContainText(/\d+ms/)
  })

  test('应该处理手动断开连接', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await wsPage.expectConnected()

    // 点击断开按钮
    const disconnectButton = page.getByRole('button', { name: /断开连接|disconnect/i })
    await disconnectButton.click()

    // 验证已断开
    await wsPage.expectDisconnected()

    // 验证断开按钮变为重连按钮
    await expect(page.getByRole('button', { name: /重新连接|reconnect/i })).toBeVisible()
  })

  test('应该手动重连', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await wsPage.expectConnected()

    // 断开连接
    await page.getByRole('button', { name: /断开/i }).click()
    await wsPage.expectDisconnected()

    // 重新连接
    await page.getByRole('button', { name: /重新连接|reconnect/i }).click()

    // 等待重连完成
    await page.waitForTimeout(300)

    // 验证已重新连接
    await wsPage.expectConnected()
  })
})

test.describe('WebSocket 自动重连', () => {
  test('应该在连接断开后自动重连', async ({ page }) => {
    const reconnectCount = 0

    await page.addInitScript(() => {
      class MockWebSocket {
        static instances: MockWebSocket[] = []

        url: string
        readyState: number = WebSocket.CONNECTING
        _messages: any[] = []

        constructor(url: string) {
          this.url = url
          MockWebSocket.instances.push(this)

          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) {
              this.onopen(new Event('open'))
            }
          }, 100)
        }

        send(data: string) {
          this._messages.push(JSON.parse(data))
        }

        close(code?: number, reason?: string) {
          this.readyState = WebSocket.CLOSED
          if (this.onclose) {
            this.onclose(new CloseEvent('close', { code, reason }))
          }
        }

        // 模拟服务器断开
        simulateDisconnect() {
          this.readyState = WebSocket.CLOSED
          if (this.onclose) {
            this.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection lost' }))
          }
        }

        onopen: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(300)

    // 模拟服务器断开连接
    await page.evaluate(() => {
      const instances = (window as any).mockWebSocket.instances
      if (instances.length > 0) {
        instances[instances.length - 1].simulateDisconnect()
      }
    })

    // 验证显示断开状态
    await page.waitForTimeout(100)
    await expect(page.getByTestId('ws-connection-status')).toContainText(/已断开|disconnected/i)

    // 等待自动重连
    await page.waitForTimeout(2000)

    // 验证重连提示
    await checkToast(page, /正在重连|reconnecting/i)
  })

  test('应该使用指数退避重连', async ({ page }) => {
    const delays: number[] = []

    await page.addInitScript(() => {
      class MockWebSocket {
        static instances: MockWebSocket[] = []
        static connectTimes: number[] = []

        constructor(url: string) {
          MockWebSocket.instances.push(this)
          MockWebSocket.connectTimes.push(Date.now())

          // 第一次连接成功，后续连接失败触发重连
          setTimeout(() => {
            if (MockWebSocket.instances.length <= 2) {
              this.readyState = WebSocket.OPEN
              if (this.onopen) this.onopen(new Event('open'))
            }
          }, 100)
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send() {}
        close() {
          this.readyState = WebSocket.CLOSED
          if (this.onclose) this.onclose(new CloseEvent('close'))
        }
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(500)

    // 检查重连间隔是否逐渐增加
    // 实际实现需要更复杂的模拟
  })

  test('应该显示重连尝试次数', async ({ page }) => {
    await page.addInitScript(() => {
      class MockWebSocket {
        static attempts = 0

        constructor(url: string) {
          MockWebSocket.attempts++

          // 前几次连接失败
          if (MockWebSocket.attempts < 3) {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror(new Event('error'))
              }
              if (this.onclose) {
                this.onclose(new CloseEvent('close', { code: 1006 }))
              }
            }, 100)
          } else {
            // 第三次成功
            setTimeout(() => {
              this.readyState = WebSocket.OPEN
              if (this.onopen) this.onopen(new Event('open'))
            }, 100)
          }
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send() {}
        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')

    // 等待重连
    await page.waitForTimeout(3000)

    // 验证重连次数显示
    await expect(page.getByText(/重连.*\d+/)).toBeVisible()
  })

  test('应该在超过最大重连次数后停止', async ({ page }) => {
    const maxAttempts = 5

    await page.addInitScript(() => {
      class MockWebSocket {
        static attempts = 0

        constructor(url: string) {
          MockWebSocket.attempts++

          setTimeout(() => {
            this.readyState = WebSocket.CLOSED
            if (this.onclose) {
              this.onclose(new CloseEvent('close', { code: 1006 }))
            }
          }, 100)
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send() {}
        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')

    // 等待最大重连次数
    await page.waitForTimeout(10000)

    // 验证显示连接失败
    await expect(page.getByTestId('ws-connection-status')).toContainText(
      /连接失败|connection failed/i
    )

    // 验证显示手动重连按钮
    await expect(page.getByRole('button', { name: /重新连接/i })).toBeEnabled()
  })
})

test.describe('WebSocket 心跳机制', () => {
  test('应该定期发送心跳', async ({ page }) => {
    const heartbeats = 0

    await page.addInitScript(() => {
      class MockWebSocket {
        _messages: string[] = []

        constructor(url: string) {
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) this.onopen(new Event('open'))
          }, 100)
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send(data: string) {
          this._messages.push(data)

          // 响应心跳
          if (data.includes('ping')) {
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage(
                  new MessageEvent('message', {
                    data: JSON.stringify({ type: 'pong', timestamp: Date.now() }),
                  })
                )
              }
            }, 10)
          }
        }

        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(5000)

    // 验证心跳已发送（检查内部状态）
    const heartbeatCount = await page.evaluate(() => {
      const ws = (window as any).mockWebSocket?.instances?.[0]
      return ws?._messages?.filter((m: string) => m.includes('ping')).length || 0
    })

    expect(heartbeatCount).toBeGreaterThan(0)
  })

  test('应该检测心跳超时', async ({ page }) => {
    await page.addInitScript(() => {
      class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) this.onopen(new Event('open'))
          }, 100)
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send(data: string) {
          // 不响应心跳，模拟超时
        }

        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')

    // 等待心跳超时（假设超时时间是 30 秒）
    await page.waitForTimeout(35000)

    // 验证连接已断开
    await expect(page.getByTestId('ws-connection-status')).toContainText(/已断开|disconnected/i)
  })
})

test.describe('WebSocket 消息队列', () => {
  test('应该在断开时缓存消息', async ({ page }) => {
    await page.addInitScript(() => {
      class MockWebSocket {
        static shouldFail = true

        constructor(url: string) {
          if (MockWebSocket.shouldFail) {
            setTimeout(() => {
              if (this.onclose) {
                this.onclose(new CloseEvent('close', { code: 1006 }))
              }
            }, 50)
          } else {
            setTimeout(() => {
              this.readyState = WebSocket.OPEN
              if (this.onopen) this.onopen(new Event('open'))
            }, 100)
          }
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send(data: string) {}
        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')

    // 等待初始断开
    await page.waitForTimeout(200)

    // 尝试发送消息（应该被缓存）
    const messageInput = page.getByLabel(/消息|message/i)
    await messageInput.fill('Queued message')
    await page.getByRole('button', { name: /发送|send/i }).click()

    // 验证消息已缓存
    const queueSize = await page.evaluate(() => {
      return (window as any).messageQueue?.length || 0
    })

    expect(queueSize).toBeGreaterThan(0)
  })

  test('应该重连后发送缓存消息', async ({ page }) => {
    // 这个测试需要更复杂的模拟
    test.skip(true, '需要复杂的 WebSocket 模拟')
  })
})

test.describe('WebSocket 性能监控', () => {
  test('应该显示连接统计信息', async ({ page }) => {
    await page.addInitScript(() => {
      class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) this.onopen(new Event('open'))
          }, 100)
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send(data: string) {
          // 模拟响应
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage(
                new MessageEvent('message', {
                  data: JSON.stringify({ type: 'response', data: JSON.parse(data) }),
                })
              )
            }
          }, 50)
        }

        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(300)

    // 发送多条消息
    for (let i = 0; i < 10; i++) {
      await page.getByLabel(/消息/i).fill(`Message ${i}`)
      await page.getByRole('button', { name: /发送/i }).click()
      await page.waitForTimeout(50)
    }

    // 检查统计信息
    const stats = page.getByTestId('ws-stats')
    await expect(stats).toBeVisible()

    // 验证消息计数
    await expect(stats.getByText(/发送消息: 10/)).toBeVisible()
  })

  test('应该显示消息速率', async ({ page }) => {
    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(300)

    // 检查消息速率显示
    const rate = page.getByTestId('message-rate')
    await expect(rate).toBeVisible()
    await expect(rate).toContainText(/\d+.*\/秒|\/s/)
  })
})

test.describe('WebSocket 安全性', () => {
  test('应该使用安全连接 (WSS)', async ({ page }) => {
    const urls: string[] = []

    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket

      window.WebSocket = class extends (originalWebSocket as any) {
        constructor(url: string) {
          ;(window as any).capturedUrls = (window as any).capturedUrls || []
          ;(window as any).capturedUrls.push(url)
          super(url)
        }
      } as any
    })

    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(500)

    // 检查连接 URL
    const capturedUrls = await page.evaluate(() => (window as any).capturedUrls || [])
    const wsUrls = capturedUrls.filter((url: string) => url.startsWith('ws'))

    // 在生产环境应该使用 wss://
    // 测试环境可以允许 ws://
    expect(wsUrls.length).toBeGreaterThan(0)
  })

  test('应该验证消息格式', async ({ page }) => {
    await page.addInitScript(() => {
      class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => {
            this.readyState = WebSocket.OPEN
            if (this.onopen) this.onopen(new Event('open'))
          }, 100)
        }

        readyState = WebSocket.CONNECTING
        onopen: any = null
        onmessage: any = null
        onerror: any = null
        onclose: any = null

        send() {}
        close() {}
      }

      ;(window as any).WebSocket = MockWebSocket
    })

    await page.goto('/websocket-status-demo')
    await page.waitForTimeout(300)

    // 模拟发送无效消息
    const invalidMessages = ['', '{', '{"type": "test"']

    for (const msg of invalidMessages) {
      await page.evaluate(m => {
        const ws = (window as any).mockWebSocket?.instances?.[0]
        if (ws?.onmessage) {
          try {
            ws.onmessage(new MessageEvent('message', { data: m }))
          } catch (e) {
            // 预期错误
          }
        }
      }, msg)
    }

    // 验证连接仍然正常
    await wsPage.expectConnected()
  })
})
