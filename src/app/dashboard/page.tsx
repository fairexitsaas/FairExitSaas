import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const tabParam = resolvedParams?.tab

  if (tabParam === 'users') {
    redirect('/admin/users')
  } else if (tabParam === 'lawyer-requests' || tabParam === 'requests') {
    redirect('/admin/lawyer-requests')
  } else if (tabParam === 'reports') {
    redirect('/admin/reports')
  } else if (tabParam === 'lawyers') {
    redirect('/admin/lawyers')
  }

  redirect('/admin/overview')
}
