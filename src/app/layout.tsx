import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { GroceryListProvider } from '@/lib/contexts/GroceryListContext'
import { Metadata } from 'next'
import WelcomeBar from '@/components/WelcomeBar'
import Footer from '@/components/Footer'
import Script from 'next/script'
import AddToHomeScreen from '@/components/AddToHomeScreen'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tastly - Your Recipe Manager',
  description: 'Extract, save, and organize your favorite recipes',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.jpg', type: 'image/jpeg', sizes: '192x192' },
      { url: '/icon-512.jpg', type: 'image/jpeg', sizes: '512x512' },
      { url: '/android-chrome-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/android-chrome-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.jpg', sizes: '180x180' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tastly',
    startupImage: [
      '/apple-splash-2048-2732.jpg',
      '/apple-splash-1668-2388.jpg',
      '/apple-splash-1536-2048.jpg',
      '/apple-splash-1125-2436.jpg',
      '/apple-splash-1242-2688.jpg',
    ]
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    minimumScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  themeColor: '#10131a',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10131a',
  viewportFit: 'cover',
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tastly" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <AuthProvider>
          <GroceryListProvider>
            <WelcomeBar />
            <main>
              {children}
            </main>
            <Footer />
            <AddToHomeScreen />
          </GroceryListProvider>
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
