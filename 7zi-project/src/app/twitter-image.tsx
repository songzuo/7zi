import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 600,
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(to bottom, #1e1b4b, #312e81, #4c1d95)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: 60,
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 'bold',
            marginBottom: 30,
            letterSpacing: 3,
          }}
        >
          7zi-Frontend
        </div>
        <div
          style={{
            fontSize: 42,
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.4,
            opacity: 0.95,
          }}
        >
          现代化任务管理与协作平台
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 50,
            opacity: 0.7,
          }}
        >
          Next.js 16 · React 19 · TypeScript
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
