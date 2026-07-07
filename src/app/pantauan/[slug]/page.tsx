'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Map slug to dynamic component imports
const pageComponents: Record<string, React.ComponentType> = {
  bnpb: dynamic(() => import('@/components/pantauan/pages/PantauanBNPBPage'), { ssr: false, loading: () => <PageLoader /> }),
  media: dynamic(() => import('@/components/pantauan/pages/PantauanMediaPage'), { ssr: false, loading: () => <PageLoader /> }),
  angin: dynamic(() => import('@/components/pantauan/pages/PergerakanAnginPage'), { ssr: false, loading: () => <PageLoader /> }),
  penyakit: dynamic(() => import('@/components/pantauan/pages/PenyakitMenularPage'), { ssr: false, loading: () => <PageLoader /> }),
  karhutla: dynamic(() => import('@/components/pantauan/pages/HotspotKarhutlaPage'), { ssr: false, loading: () => <PageLoader /> }),
  cuaca: dynamic(() => import('@/components/pantauan/pages/CuacaPage'), { ssr: false, loading: () => <PageLoader /> }),
  gempa: dynamic(() => import('@/components/pantauan/pages/GempaBumiPage'), { ssr: false, loading: () => <PageLoader /> }),
  'gunung-berapi': dynamic(() => import('@/components/pantauan/pages/GunungBerapiPage'), { ssr: false, loading: () => <PageLoader /> }),
  tanah: dynamic(() => import('@/components/pantauan/pages/PergerakanTanahPage'), { ssr: false, loading: () => <PageLoader /> }),
}

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-slate-500 font-semibold">Memuat halaman...</p>
      </div>
    </div>
  )
}

export default function PantauanPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const Component = pageComponents[resolvedParams.slug]
  if (!Component) {
    notFound()
  }
  return <Component />
}
