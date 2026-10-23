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
  weight: ['400', '600'],
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f6f4ef] text-[#17242f] font-sans">
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
