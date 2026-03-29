import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cognita Rebuild',
  description: 'Cognita yeni mimari iskeleti'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
