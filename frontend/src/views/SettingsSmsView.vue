<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const ui = useUiStore()
const { t } = useI18n()

// 啟用開關
const enabled = ref<boolean>(JSON.parse(localStorage.getItem('sms.enabled') || 'false'))
function toggleEnabled() {
  enabled.value = !enabled.value
  localStorage.setItem('sms.enabled', JSON.stringify(enabled.value))
}

// 國碼最小化：常用列表 + 數字篩選
const CODES = [
  { code: '+1', name: 'United States/Canada' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+61', name: 'Australia' },
  { code: '+65', name: 'Singapore' },
  { code: '+81', name: 'Japan' },
  { code: '+82', name: 'Korea' },
  { code: '+84', name: 'Vietnam' },
  { code: '+86', name: 'China' },
  { code: '+852', name: 'Hong Kong' },
  { code: '+853', name: 'Macau' },
  { code: '+855', name: 'Cambodia' },
  { code: '+856', name: 'Laos' },
  { code: '+886', name: 'Taiwan' },
]
const codePickerOpen = ref(false)
const codeFilter = ref('')
const filtered = computed(() => {
  const f = codeFilter.value.replace(/[^0-9+]/g, '')
  if (!f) return CODES
  return CODES.filter((c) => c.code.startsWith(f) || c.name.toLowerCase().includes(f.toLowerCase()))
})
const codeIndex = ref(0)
const selectedCode = ref<string>(localStorage.getItem('sms.code') || '+886')
function openPicker() {
  codePickerOpen.value = true
  codeFilter.value = ''
  codeIndex.value = 0
}
function closePicker() {
  codePickerOpen.value = false
}
function chooseCode(idx: number) {
  const it = filtered.value[idx]
  if (!it) return
  selectedCode.value = it.code
  localStorage.setItem('sms.code', selectedCode.value)
  closePicker()
}

// 手機號碼
const phone = ref<string>(localStorage.getItem('sms.phone') || '')
function savePhone() {
  localStorage.setItem('sms.phone', phone.value)
}

// 焦點：0=Enable, 1=Code, 2=Phone
const focus = ref(0)

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return

  // 若國碼選擇器開啟，優先處理
  if (codePickerOpen.value) {
    if (e.key === 'Enter') {
      e.preventDefault()
      chooseCode(codeIndex.value)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      codeIndex.value = (codeIndex.value + dir + filtered.value.length) % filtered.value.length
      return
    }
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (codeFilter.value) codeFilter.value = codeFilter.value.slice(0, -1)
      else closePicker()
      codeIndex.value = 0
      return
    }
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      codeFilter.value = (codeFilter.value + e.key).slice(0, 6)
      codeIndex.value = 0
      return
    }
    return
  }

  // 一般焦點移動
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    focus.value = Math.max(0, Math.min(2, focus.value + dir))
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (focus.value === 0) toggleEnabled()
    else if (focus.value === 1) openPicker()
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (focus.value === 0) {
      e.preventDefault()
      toggleEnabled()
      return
    }
  }
  // 數字輸入（電話）
  if (focus.value === 2 && e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    phone.value = (phone.value + e.key).slice(0, 20)
    savePhone()
    return
  }
  if (focus.value === 2 && e.key === 'Backspace' && phone.value) {
    e.preventDefault()
    phone.value = phone.value.slice(0, -1)
    savePhone()
    return
  }
  // 在 Code 區按數字：直接開啟選擇器並套用 filter
  if (focus.value === 1 && e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    openPicker()
    codeFilter.value = e.key
    return
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-sky-500 via-emerald-400 to-lime-400 text-black"
  >
    <div class="flex-1 p-2 text-sm space-y-2 overflow-hidden">
      <!-- Enable -->
      <div
        class="bg-white/70 rounded p-2 flex items-center justify-between"
        :class="focus === 0 ? 'ring-2 ring-black/40' : ''"
      >
        <div>{{ t('sms.enable') }}</div>
        <button class="px-2 py-1 rounded bg-black/80 text-white">
          {{ enabled ? 'ON' : 'OFF' }}
        </button>
      </div>

      <!-- Code + Phone -->
      <div class="bg-white/70 rounded p-2" :class="focus >= 1 ? 'ring-2 ring-black/40' : ''">
        <div class="text-xs opacity-80 mb-1">{{ t('sms.phoneNumber') }}</div>
        <div class="flex items-center gap-2">
          <!-- Country code button -->
          <div class="relative">
            <button
              class="rounded bg-white px-2 py-1 text-black min-w-[54px]"
              :class="focus === 1 ? 'ring-2 ring-black/50' : ''"
            >
              {{ selectedCode }}
            </button>
            <!-- Picker -->
            <div
              v-if="codePickerOpen"
              class="absolute z-10 mt-1 w-48 max-h-40 overflow-auto bg-white text-black rounded shadow"
            >
              <div class="px-2 py-1 text-[11px] text-black/70">
                {{ t('sms.typeToFilter') }}: {{ codeFilter || '—' }}
              </div>
              <ul class="divide-y divide-black/5">
                <li v-for="(c, idx) in filtered" :key="c.code">
                  <div class="px-2 py-1" :class="idx === codeIndex ? 'bg-black/10' : ''">
                    {{ c.code }} — {{ c.name }}
                  </div>
                </li>
              </ul>
            </div>
          </div>
          <!-- Phone input (display only;數字鍵輸入) -->
          <div
            class="rounded bg-white px-2 py-1 text-black flex-1"
            :class="focus === 2 ? 'ring-2 ring-black/50' : ''"
          >
            {{ phone || t('sms.enterNumbers') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
