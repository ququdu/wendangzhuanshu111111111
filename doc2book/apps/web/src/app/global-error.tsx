'use client'

import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            marginBottom: '1rem',
            color: '#ef4444',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#111827',
          }}>
            应用出错了
          </h2>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem',
            maxWidth: '400px',
          }}>
            发生了一个严重错误，请尝试刷新页面或返回首页
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              重试
            </button>
            <a
              href="/"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              返回首页
            </a>
          </div>
          {error.digest && (
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginTop: '2rem',
            }}>
              错误代码: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
