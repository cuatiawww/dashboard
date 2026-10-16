import { Metadata } from 'next'
import KarhutlaIndonesiaPage from '@/components/kejadian/KarhutlaIndonesiaPage'

export const metadata: Metadata = {
  title: 'Detail Kejadian Karhutla Indonesia | Dashboard EOC Kemenkes',
  description: 'Pemantauan komprehensif dampak krisis kesehatan kebakaran hutan dan lahan (Karhutla), sebaran titik panas hotspot, kualitas udara ISPU/PM2.5, dan kesiapan fasilitas pelayanan kesehatan di wilayah Indonesia.',
}

export default function Page() {
  return <KarhutlaIndonesiaPage />
}
