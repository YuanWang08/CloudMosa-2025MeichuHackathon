<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

type Item =
  | { type: 'link'; label: string; to: string }
  | { type: 'toggle'; label: string; key: 'theme'; value: 'light' | 'dark' }
  | { type: 'select'; label: string; key: 'defaultPage'; value: 'broadcast' | 'message' }
  | { type: 'placeholder'; label: string }

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

// 偏好設定：localStorage 持久化
function readTheme(): 'light' | 'dark' {
  const v = localStorage.getItem('theme')
  return v === 'dark' || v === 'light' ? v : 'light'
}
function readDefaultPage(): 'broadcast' | 'message' {
  const v = localStorage.getItem('defaultPage')
  return v === 'message' || v === 'broadcast' ? v : 'broadcast'
}
const theme = ref<'light' | 'dark'>(readTheme())
const defaultPage = ref<'broadcast' | 'message'>(readDefaultPage())

watch(theme, (v) => {
  localStorage.setItem('theme', v)
  document.documentElement.classList.toggle('dark', v === 'dark')
})
watch(defaultPage, (v) => localStorage.setItem('defaultPage', v))

const items = ref<Item[]>([
  { type: 'link', label: t('settings.language'), to: '/settings/language' },
  { type: 'toggle', label: t('settings.appearance'), key: 'theme', value: theme.value },
  {
    type: 'select',
    label: t('settings.defaultPage'),
    key: 'defaultPage',
    value: defaultPage.value,
  },
  { type: 'link', label: t('settings.smsPush'), to: '/settings/sms' },
  { type: 'link', label: t('settings.favoriteEmojis'), to: '/settings/emoji' },
  { type: 'link', label: t('settings.profile'), to: '/settings/profile' },
])

const active = ref(0)
const refs = ref<Array<HTMLButtonElement | null>>([])
function setRef(el: HTMLButtonElement | null, idx: number) {
  refs.value[idx] = el
}
function focusActive() {
  refs.value[active.value]?.focus()
}

// 避免在模板中使用 TypeScript 斷言，提供包裝函式
function onItemRef(el: unknown, idx: number) {
  setRef((el as HTMLButtonElement) || null, idx)
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    const total = items.value.length + 1 // +1 for Logout item
    active.value = (active.value + dir + total) % total
    nextTick(focusActive)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    activate(active.value)
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const it = items.value[active.value]
    if (it?.type === 'toggle') {
      e.preventDefault()
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
      it.value = theme.value
    } else if (it?.type === 'select') {
      e.preventDefault()
      defaultPage.value = defaultPage.value === 'broadcast' ? 'message' : 'broadcast'
      it.value = defaultPage.value
    }
  }
}

function activate(idx: number) {
  const it = items.value[idx]
  // Logout is the virtual last item (index === items.length)
  if (idx === items.value.length) {
    // 確認框
    ui.openConfirm(t('settings.confirmLogout'), false).then((ok) => {
      if (ok) {
        auth.clear()
        router.replace('/signin')
      }
    })
    return
  }
  if (!it) return
  if (it.type === 'link') router.push(it.to)
  if (it.type === 'toggle') {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    it.value = theme.value
  }
  if (it.type === 'select') {
    defaultPage.value = defaultPage.value === 'broadcast' ? 'message' : 'broadcast'
    it.value = defaultPage.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextTick(focusActive)
  // 初始套用主題
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-sky-500 via-emerald-400 to-lime-400 text-black"
  >
    <div class="flex-1 content-scroll p-2 text-sm">
      <ul class="space-y-2">
        <li v-for="(it, idx) in items" :key="idx">
          <button
            :ref="(el) => onItemRef(el, idx)"
            class="w-full text-left rounded px-2 py-2 flex items-center justify-between"
            :class="active === idx ? 'bg-black/20' : 'bg-white/70'"
            @click="activate(idx)"
          >
            <span>{{ it.label }}</span>
            <span v-if="it.type === 'toggle'">{{ it.value === 'dark' ? '🌙' : '☀️' }}</span>
            <span v-else-if="it.type === 'select'">{{
              it.value === 'broadcast' ? '📢' : '💬'
            }}</span>
          </button>
        </li>
      </ul>
      <!-- Logout button at bottom (same visual style) -->
      <div class="mt-2">
        <button
          :ref="(el) => onItemRef(el, items.length)"
          class="w-full text-left rounded px-2 py-2 flex items-center justify-between"
          :class="active === items.length ? 'bg-black/20' : 'bg-white/70'"
          @click="activate(items.length)"
          @focus="active = items.length"
        >
          <span>{{ t('settings.logout') }}</span>
          <span>↩️</span>
        </button>
      </div>
    </div>
  </div>
</template>
