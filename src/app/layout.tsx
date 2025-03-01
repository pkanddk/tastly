import { AuthProvider } from '@/lib/contexts/AuthContext'
import './globals.css'
import type { Metadata } from 'next'
import WelcomeBar from '@/components/WelcomeBar'

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
