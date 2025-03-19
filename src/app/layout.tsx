import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { Metadata } from 'next'
import WelcomeBar from '@/components/WelcomeBar'
import Footer from '@/components/Footer'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tastly - Your Recipe Manager',
  description: 'Extract, save, and organize your favorite recipes',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.jpg', type: 'image/jpeg', sizes: '192x192' },
      { url: '/icon-512.jpg', type: 'image/jpeg', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.jpg', sizes: '180x180' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tastly'
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#111827',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111827',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.jpg" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍽️</text></svg>" />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen flex flex-col relative`}>
        <AuthProvider>
          <WelcomeBar />
          <main className="flex-grow pt-16 relative z-0">
            {children}
          </main>
          <Footer />
        </AuthProvider>
        
        {/* Service Worker Registration */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
