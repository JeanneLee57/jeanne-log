import './globals.css'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Layout } from '../components/Layout'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'jeanne-log',
  description: '프론트엔드 개발자 Jeanne의 블로그',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  )
}