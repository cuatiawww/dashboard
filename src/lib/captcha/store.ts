import { MemoryCaptchaStore } from './memory-store'
import { UpstashCaptchaStore } from './upstash-store'
import type { CaptchaStore } from './types'

const storeMode = process.env.CAPTCHA_STORE?.toLowerCase()

export const createCaptchaStore = (): CaptchaStore => {
  if (storeMode === 'upstash' || storeMode === 'redis') {
    return new UpstashCaptchaStore()
  }

  return new MemoryCaptchaStore()
}
