import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { Metadata } from 'next'
import WelcomeBar from '@/components/WelcomeBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tastly - Your Personal Recipe Manager',
  description: 'Extract recipes from any website, organize your collection, and never lose a recipe again.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tastly',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#1F2937',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Add any additional meta tags here */}
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-md">
            <WelcomeBar />
          </header>
          
          <main>
            {children}
          </main>
          
          <footer>
            <div className="container mx-auto px-4 py-4">
              <p className="text-center text-gray-400">© 2025 Tastly. a pk and dk app.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
