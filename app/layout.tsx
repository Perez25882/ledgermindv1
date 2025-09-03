import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from 'next-themes'
import { NavigationProgress } from '@/components/navigation-progress'
import './globals.css'

export const metadata: Metadata = {
  title: 'LedgerMind - AI-Powered Inventory Management',
  description: 'Transform your business with intelligent inventory management, real-time analytics, and AI-driven insights',
  generator: 'LedgerMind',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavigationProgress />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
