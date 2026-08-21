'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const TvNttGempaDashboardContainer = dynamic(
  () => import('@/components/tv/TvNttGempaDashboardContainer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-400" />
          <p className="text-sm font-black tracking-widest text-teal-300 uppercase">
            Memuat Video Wall Command Center EOC Gempa NTT...
          </p>
        </div>
      </div>
    ),
  }
)

export default function TvNttGempaUnderscorePage() {
  return <TvNttGempaDashboardContainer />
}
