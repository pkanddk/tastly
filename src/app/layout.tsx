import { AuthProvider } from '@/lib/contexts/AuthContext'
import './globals.css'
import type { Metadata } from 'next'
import WelcomeBar from '@/components/WelcomeBar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Tastly - Recipe Saver',
  description: 'Save and organize your favorite recipes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-gray-900 flex flex-col">
            <WelcomeBar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
