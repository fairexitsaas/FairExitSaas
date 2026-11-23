import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Consult a Severance Lawyer | FairExit',
  description: 'Connect with a qualified employment lawyer to review your severance package and negotiate your exit.',
  referrer: 'no-referrer',
}

export default function LawyerRequestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
