
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { SessionProviderWrapper } from '@/components/providers/session-provider'
import { Sidebar } from '@/components/layout/sidebar'
import { ConditionalNavBar } from '@/components/layout/conditional-nav-bar'
import { SessionTimeout } from '@/components/security/session-timeout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://bguard.com'),
  title: 'BGuard - AI-Powered Application Security Platform | Cybersecurity Solutions',
  description: 'Comprehensive application security platform with AI-powered threat modeling, STRIDE analysis, NIST SP 800-53 integration, automated CVSS scoring, and enterprise-grade security assessment tools.',
  keywords: [
    'threat modeling',
    'cybersecurity',
    'STRIDE analysis',
    'security assessment',
    'vulnerability assessment',
    'application security',
    'AI security',
    'NIST SP 800-53',
    'OWASP',
    'CVSS scoring',
    'security framework',
    'penetration testing',
    'security compliance',
    'enterprise security',
    'risk assessment',
    'security automation',
    'cyber threats',
    'security platform'
  ].join(', '),
  authors: [{ name: 'BGuard Team' }],
  creator: 'BGuard',
  publisher: 'BGuard',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bguard.com',
    title: 'BGuard - AI-Powered Application Security Platform',
    description: 'Comprehensive application security platform with AI-powered threat modeling, STRIDE analysis, security framework integration, and enterprise-grade cybersecurity tools.',
    siteName: 'BGuard',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BGuard - Professional Application Security Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BGuard - AI-Powered Application Security Platform',
    description: 'Comprehensive application security platform with AI-powered threat modeling, STRIDE analysis and security framework integration.',
    images: ['/twitter-image.png'],
    creator: '@bguard',
  },
  alternates: {
    canonical: 'https://bguard.com',
  },
  category: 'Cybersecurity',
  classification: 'Business Software',
  other: {
    'application-name': 'BGuard',
    'apple-mobile-web-app-title': 'BGuard',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#2563eb',
    'theme-color': '#ffffff',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProviderWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen bg-background flex flex-col">
              <ConditionalNavBar />
              <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 container mx-auto px-4 py-8 lg:pl-8">
                  {children}
                </main>
              </div>
            </div>
            <SessionTimeout />
            <Toaster />
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
