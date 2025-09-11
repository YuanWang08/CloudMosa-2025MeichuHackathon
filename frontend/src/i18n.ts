// src/i18n.ts
import { createI18n } from 'vue-i18n'

export const SUPPORT_LOCALES = ['en', 'zh-TW'] as const
type Locale = (typeof SUPPORT_LOCALES)[number]

function detectLocale(): Locale {
  const saved = localStorage.getItem('locale') as Locale | null
  if (saved && SUPPORT_LOCALES.includes(saved)) return saved
  const nav = navigator.language
  if (nav.startsWith('zh')) return 'zh-TW'
  return 'en'
}

export const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {}, // 先不塞，改走懶載入
})

export async function setLocale(locale: Locale) {
  if (!i18n.global.availableLocales.includes(locale)) {
    const messages = await import(`./locales/${locale}.json`)
    i18n.global.setLocaleMessage(locale, messages.default)
  }
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
  document.documentElement.setAttribute('lang', locale)
}

// 啟動時先載入預設語系
export async function loadInitialMessages() {
  const loc = i18n.global.locale.value as Locale
  if (!i18n.global.availableLocales.includes(loc)) {
    const messages = await import(`./locales/${loc}.json`)
    i18n.global.setLocaleMessage(loc, messages.default)
  }
  document.documentElement.setAttribute('lang', loc)
}
