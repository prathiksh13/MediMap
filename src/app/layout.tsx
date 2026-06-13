import type { Metadata } from 'next'
import './globals.css'
import ClickSpark from '@/components/ui/ClickSpark'

export const metadata: Metadata = {
  title: 'MediMap — Health Intelligence for Every Patient',
  description: 'Upload your medical reports. Understand your values. Track your health over time.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClickSpark sparkColor="#a78bfa " sparkSize={12} sparkRadius={18} sparkCount={8} duration={450} />
        {children}
      </body>
    </html>
  )
}
