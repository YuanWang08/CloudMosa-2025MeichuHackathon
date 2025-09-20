<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'
import { smsApi, type SmsSchedule, type SmsSettings } from '@/lib/api'
import { useDisableMenu } from '@/composables/useDisableMenu'

const ui = useUiStore()
const { t } = useI18n()
// 滾動容器與各區塊 refs
const scrollBox = ref<HTMLDivElement | null>(null)
const enableCard = ref<HTMLDivElement | null>(null)
const codePhoneCard = ref<HTMLDivElement | null>(null)
const schedulesCard = ref<HTMLDivElement | null>(null)
const timezoneCard = ref<HTMLDivElement | null>(null)

useDisableMenu()

function scrollFocusedIntoView() {
  const targets = [
    enableCard.value,
    codePhoneCard.value,
    codePhoneCard.value,
    schedulesCard.value,
    timezoneCard.value,
  ]
  const el = targets[focus.value] as HTMLElement | null | undefined
  const box = scrollBox.value
  if (!el || !box) return
  // 使用 scrollIntoView 讓最近的滾動容器滾動
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

// 啟用開關（從後端載入）
const enabled = ref<boolean>(false)
function toggleEnabled() {
  enabled.value = !enabled.value
  dirty.value = true
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
const codeList = ref<HTMLUListElement | null>(null)
const filtered = computed(() => {
  const f = codeFilter.value.replace(/[^0-9+]/g, '')
  if (!f) return CODES
  return CODES.filter((c) => c.code.startsWith(f) || c.name.toLowerCase().includes(f.toLowerCase()))
})
const codeIndex = ref(0)
const selectedCode = ref<string>('+886')
function openPicker() {
  codePickerOpen.value = true
  codeFilter.value = ''
  codeIndex.value = 0
  nextTick(() => scrollCodeIntoView())
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

function scrollCodeIntoView() {
  const ul = codeList.value
  if (!ul) return
  const idx = codeIndex.value
  const li = ul.children[idx] as HTMLElement | undefined
  if (!li) return
  const liTop = li.offsetTop
  const liBottom = liTop + li.offsetHeight
  const viewTop = ul.scrollTop
  const viewBottom = viewTop + ul.clientHeight
  if (liTop < viewTop) ul.scrollTop = liTop
  else if (liBottom > viewBottom) ul.scrollTop = liBottom - ul.clientHeight
}

// 手機號碼
const phone = ref<string>('')
function savePhone() {
  dirty.value = true
}

// Schedules (max 3)
type LocalSmsSchedule = SmsSchedule & { enabled?: boolean }
const schedules = ref<LocalSmsSchedule[]>([])
const scheduleIndex = ref(0) // 0..2 (row)
// 子焦點：0=time（Enter 編輯時間），1=toggle（Enter 切換 ON/OFF）
const slotPart = ref(0)
function ensureScheduleRows() {
  while (schedules.value.length < 3)
    // 使用 enabled: false 佔位（不送到後端）
    schedules.value.push({ hour: 9, minute: 0, enabled: false })
}

// 焦點：0=Enable, 1=Code, 2=Phone, 3=Schedules
const focus = ref(0)
const dirty = ref(false)
const timezone = ref<string>('Asia/Taipei')
const tzPickerOpen = ref(false)
const TZ = ['Asia/Taipei', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'UTC']
const tzIndex = ref(0)

// 時間編輯彈窗
const timeEditorOpen = ref(false)
const editHour = ref(0)
const editMinute = ref(0)
function openTimeEditor() {
  const sc = schedules.value[scheduleIndex.value]
  if (!sc) return
  editHour.value = sc.hour
  editMinute.value = sc.minute
  timeEditorOpen.value = true
}
function closeTimeEditor(save = false) {
  if (save) {
    const sc = schedules.value[scheduleIndex.value]
    if (sc) {
      sc.hour = editHour.value
      sc.minute = editMinute.value
      dirty.value = true
      // 直接保存，減少操作步驟
      saveAll().catch(() => {})
    }
  }
  timeEditorOpen.value = false
}

async function load() {
  const s = await smsApi.getSettings()
  enabled.value = s.enabled
  phone.value = s.phone || ''
  timezone.value = s.timezone || 'Asia/Taipei'
  // 解析國碼（預設 +886）
  const m = phone.value.match(/^(\+\d{1,4})\s*(.*)$/)
  if (m) {
    selectedCode.value = m[1]
    phone.value = m[2]
  } else {
    selectedCode.value = '+886'
  }
  schedules.value = [...(s.schedules || [])].map((sc) => ({ ...sc, enabled: true }))
  ensureScheduleRows()
  dirty.value = false
}

async function saveAll() {
  const payload: SmsSettings = {
    enabled: enabled.value,
    phone: phone.value ? `${selectedCode.value}${phone.value}` : null,
    // 僅傳送啟用的時段
    schedules: schedules.value
      .filter((x) => x && x.hour != null && x.minute != null && x.enabled !== false)
      .map((x) => ({ hour: x.hour, minute: x.minute })),
    timezone: timezone.value,
  }
  const after = await smsApi.updateSettings(payload)
  enabled.value = after.enabled
  const savedPhone = after.phone || ''
  const m = savedPhone.match(/^(\+\d{1,4})\s*(.*)$/)
  if (m) {
    selectedCode.value = m[1]
    phone.value = m[2]
  }
  schedules.value = [...(after.schedules || [])].map((x) => ({ ...x, enabled: true }))
  timezone.value = after.timezone || timezone.value
  ensureScheduleRows()
  dirty.value = false
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return

  // 若國碼選擇器開啟，優先處理
  if (codePickerOpen.value) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      chooseCode(codeIndex.value)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closePicker()
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      codeIndex.value = (codeIndex.value + dir + filtered.value.length) % filtered.value.length
      nextTick(() => scrollCodeIntoView())
      return
    }
    if (e.key === 'Backspace') {
      e.preventDefault()
      e.stopPropagation()
      if (codeFilter.value) codeFilter.value = codeFilter.value.slice(0, -1)
      else closePicker()
      codeIndex.value = 0
      return
    }
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      e.stopPropagation()
      codeFilter.value = (codeFilter.value + e.key).slice(0, 6)
      codeIndex.value = 0
      return
    }
    return
  }

  // 時間編輯彈窗優先處理
  if (timeEditorOpen.value) {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'ArrowUp') editHour.value = (editHour.value + 1) % 24
    else if (e.key === 'ArrowDown') editHour.value = (editHour.value + 23) % 24
    else if (e.key === 'ArrowRight') editMinute.value = (editMinute.value + 5) % 60
    else if (e.key === 'ArrowLeft') editMinute.value = (editMinute.value + 55) % 60
    else if (e.key === 'Enter') closeTimeEditor(true)
    else if (e.key === 'Escape') closeTimeEditor(false)
    return
  }

  // 時區選擇器
  if (tzPickerOpen.value) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      timezone.value = TZ[tzIndex.value] || timezone.value
      tzPickerOpen.value = false
      dirty.value = true
      saveAll().catch(() => {})
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      tzPickerOpen.value = false
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      tzIndex.value = (tzIndex.value + dir + TZ.length) % TZ.length
      return
    }
    return
  }

  // 一般焦點移動
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    if (focus.value === 3) {
      // 在 Schedules 內用上下切換列
      if (dir > 0) {
        if (scheduleIndex.value < schedules.value.length - 1) scheduleIndex.value++
        else focus.value = 4
      } else {
        if (scheduleIndex.value > 0) scheduleIndex.value--
        else focus.value = 2
      }
      nextTick(() => scrollFocusedIntoView())
    } else {
      focus.value = Math.max(0, Math.min(4, focus.value + dir))
      nextTick(() => scrollFocusedIntoView())
    }
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    if (focus.value === 0) toggleEnabled()
    else if (focus.value === 1) openPicker()
    else if (focus.value === 3) {
      if (slotPart.value === 1) toggleSlot(scheduleIndex.value)
      else openTimeEditor()
    } else if (focus.value === 4) {
      tzPickerOpen.value = true
      tzIndex.value = Math.max(0, TZ.indexOf(timezone.value))
    }
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (focus.value === 0) {
      e.preventDefault()
      e.stopPropagation()
      toggleEnabled()
      return
    }
    if (focus.value === 3) {
      e.preventDefault()
      e.stopPropagation()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      slotPart.value = Math.min(1, Math.max(0, slotPart.value + dir))
      return
    }
  }
  // 數字輸入（電話）
  if (focus.value === 2 && e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    e.stopPropagation()
    phone.value = (phone.value + e.key).slice(0, 20)
    savePhone()
    return
  }
  if (focus.value === 2 && e.key === 'Backspace' && phone.value) {
    e.preventDefault()
    e.stopPropagation()
    phone.value = phone.value.slice(0, -1)
    savePhone()
    return
  }
  // 在 Code 區按數字：直接開啟選擇器並套用 filter
  if (focus.value === 1 && e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    e.stopPropagation()
    openPicker()
    codeFilter.value = e.key
    return
  }
}

onMounted(() => {
  load().catch(() => {})
  window.addEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))

function toggleSlot(idx: number) {
  const sc = schedules.value[idx]
  if (!sc) return
  sc.enabled = sc.enabled === false ? true : false
  dirty.value = true
  saveAll().catch(() => {})
}
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-tr from-pink-200 via-yellow-100 to-lime-200 text-black relative"
  >
    <div ref="scrollBox" class="flex-1 p-2 text-sm space-y-2 overflow-y-auto overflow-x-hidden">
      <!-- Enable -->
      <div
        ref="enableCard"
        class="bg-white/70 rounded p-2 flex items-center justify-between"
        :class="focus === 0 ? 'ring-2 ring-black/40' : ''"
      >
        <div>{{ t('sms.enable') }}</div>
        <button class="px-2 py-1 rounded bg-black/80 text-white">
          {{ enabled ? 'ON' : 'OFF' }}
        </button>
      </div>

      <!-- Code + Phone -->
      <div
        ref="codePhoneCard"
        class="bg-white/70 rounded p-2"
        :class="focus >= 1 ? 'ring-2 ring-black/40' : ''"
      >
        <div class="text-xs opacity-80 mb-1">{{ t('sms.phoneNumber') }}</div>
        <div class="flex items-center gap-2">
          <!-- Country code button -->
          <div class="relative">
            <button
              class="rounded bg-white px-1.5 py-0.5 text-black text-xs min-w-[48px]"
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
              <ul ref="codeList" class="divide-y divide-black/5">
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
            class="rounded bg-white px-2 py-1 text-black flex-1 min-h-[28px] flex items-center"
            :class="focus === 2 ? 'ring-2 ring-black/50' : ''"
          >
            <span v-if="phone">{{ phone }}</span>
            <span v-else aria-hidden="true">&nbsp;</span>
          </div>
        </div>
      </div>

      <!-- Schedules (daily, up to 3) -->
      <div
        ref="schedulesCard"
        class="bg-white/70 rounded p-2"
        :class="focus === 3 ? 'ring-2 ring-black/40' : ''"
      >
        <div class="text-xs opacity-80 mb-1">{{ t('sms.schedules') }}</div>
        <div class="space-y-2">
          <div
            v-for="(sc, idx) in schedules"
            :key="idx"
            class="rounded bg-white/70 p-2 text-xs"
            :class="scheduleIndex === idx && focus === 3 ? 'ring-2 ring-black/40' : ''"
            @click.prevent="((scheduleIndex = idx), (slotPart = 0), openTimeEditor())"
          >
            <div class="mb-1">Slot {{ idx + 1 }}</div>
            <div class="flex items-center justify-between gap-2">
              <div
                class="text-base font-semibold tabular-nums"
                :class="sc.enabled === false ? 'opacity-40' : ''"
              >
                {{ String(sc.hour).padStart(2, '0') }}:{{ String(sc.minute).padStart(2, '0') }}
              </div>
              <div class="flex items-center gap-1">
                <button
                  class="px-2 py-1 rounded border text-xs"
                  :class="
                    scheduleIndex === idx && slotPart === 1 && focus === 3
                      ? 'ring-2 ring-black/40 bg-black/80 text-white'
                      : 'bg-white/70'
                  "
                  @click.prevent="((scheduleIndex = idx), (slotPart = 1), toggleSlot(idx))"
                >
                  {{ sc.enabled === false ? 'OFF' : 'ON' }}
                </button>
                <button
                  class="px-2 py-1 rounded border text-xs"
                  :class="
                    scheduleIndex === idx && slotPart === 0 && focus === 3
                      ? 'ring-2 ring-black/40 bg-white'
                      : 'bg-white/70'
                  "
                  @click.prevent="((scheduleIndex = idx), (slotPart = 0), openTimeEditor())"
                >
                  {{ t('sms.editTime') }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="dirty" class="text-[11px] text-red-600 mt-1">Unsaved changes</div>
      </div>

      <!-- Timezone card -->
      <div
        ref="timezoneCard"
        class="bg-white/70 rounded p-2"
        :class="focus === 4 ? 'ring-2 ring-black/40' : ''"
      >
        <div class="text-xs opacity-80 mb-1">{{ t('sms.timezone') }}</div>
        <div class="flex items-center gap-1 flex-wrap">
          <div class="rounded bg-white/70 px-2 py-1 text-black flex-1 min-w-0 truncate text-xs">
            {{ timezone }}
          </div>
          <button
            class="px-1.5 py-0.5 text-xs rounded border bg-white/70"
            @click.prevent="tzPickerOpen = true"
          >
            {{ t('sms.change') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 時間編輯彈出視窗 -->
    <div
      v-if="timeEditorOpen"
      class="absolute inset-0 bg-black/40 flex items-center justify-center"
    >
      <div class="bg-white text-black rounded p-3 w-56">
        <div class="text-sm mb-2">Edit time</div>
        <div class="flex items-center justify-between">
          <div class="text-2xl font-bold tabular-nums">{{ String(editHour).padStart(2, '0') }}</div>
          <div class="text-2xl font-bold">:</div>
          <div class="text-2xl font-bold tabular-nums">
            {{ String(editMinute).padStart(2, '0') }}
          </div>
        </div>
        <div class="text-[11px] opacity-70 mt-2">
          ↑/↓ 小時 · ←/→ 分（+5）· Enter 保存 · Esc 取消
        </div>
      </div>
    </div>

    <!-- 時區選擇器 -->
    <div v-if="tzPickerOpen" class="absolute inset-0 bg-black/40 flex items-center justify-center">
      <div class="bg-white text-black rounded p-2 w-60 max-h-64 overflow-auto">
        <div class="text-sm mb-1">Select timezone</div>
        <ul>
          <li
            v-for="(tz, i) in TZ"
            :key="tz"
            class="px-2 py-1"
            :class="i === tzIndex ? 'bg-black/10' : ''"
            @click.prevent="
              ((timezone = tz), (tzPickerOpen = false), (dirty = true), saveAll().catch(() => {}))
            "
          >
            {{ tz }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
