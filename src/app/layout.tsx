import type { Metadata } from 'next'
import { DM_Sans, Newsreader } from 'next/font/google'
import './globals.css'
import Provider from './Provider'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: {
    default: 'Fairexit — Challenge your severance offer',
    template: '%s | Fairexit',
  },
  description:
    'Free severance check for Canada and layoff rights check for the United States.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f6f4ef] text-[#17242f] font-sans">
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
