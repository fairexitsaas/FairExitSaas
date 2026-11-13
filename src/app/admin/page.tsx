'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/overview')
  }, [router])

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-[#5f7487]">
      Redirecting to overview...
    </div>
  )
}
