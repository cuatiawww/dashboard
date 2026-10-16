'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const TvKarhutlaContainer = dynamic(
  () => import('@/components/tv/TvKarhutlaContainer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-500" />
          <p className="text-sm font-black tracking-widest text-orange-400 uppercase">
            Memuat Video Wall Command Center EOC Karhutla...
          </p>
        </div>
      </div>
    ),
  }
)

export default function KarhutlaTvPage() {
  return <TvKarhutlaContainer />
}
