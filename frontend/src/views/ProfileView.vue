<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const ui = useUiStore()
const { t } = useI18n()

// 顯示資料
const username = ref(auth.user?.username || '')
const avatarInitials = computed(() => auth.user?.avatarInitials || 'U')
const avatarColor = computed(() => auth.user?.avatarColor || '#4f46e5')

// 密碼欄位
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 焦點：0=username, 1=oldPwd, 2=newPwd, 3=confirmPwd, 4=saveUsername, 5=savePassword
const focus = ref(0)
const msg = ref<string>('')

function setMessage(m: string) {
  msg.value = m
  setTimeout(() => (msg.value = ''), 2000)
}

function validUsername(u: string) {
  return /^[A-Za-z0-9_]{6,16}$/.test(u)
}

async function saveUsername() {
  if (!auth.token) return setMessage(t('profile.msg.notAuthed'))
  if (!validUsername(username.value)) return setMessage(t('profile.msg.invalidUsername'))
  const res = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ username: username.value }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ message: t('profile.msg.error') }))
    return setMessage(e.message || t('profile.msg.failed'))
  }
  const user = await res.json()
  // 同步 store
  auth.user = user
  localStorage.setItem('user', JSON.stringify(user))
  setMessage(t('profile.msg.saved'))
}

async function savePassword() {
  if (!auth.token) return setMessage(t('profile.msg.notAuthed'))
  if (!/^[A-Za-z0-9_]{6,16}$/.test(newPassword.value))
    return setMessage(t('profile.msg.invalidNewPassword'))
  if (newPassword.value !== confirmPassword.value)
    return setMessage(t('profile.msg.passwordNotMatch'))
  const res = await fetch('/api/auth/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ oldPassword: oldPassword.value, newPassword: newPassword.value }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ message: t('profile.msg.error') }))
    return setMessage(e.message || t('profile.msg.failed'))
  }
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  setMessage(t('profile.msg.passwordUpdated'))
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  // 上下移動焦點
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    focus.value = Math.max(0, Math.min(5, focus.value + dir))
    return
  }
  // Enter 觸發儲存或切換
  if (e.key === 'Enter') {
    e.preventDefault()
    if (focus.value === 4) return void saveUsername()
    if (focus.value === 5) return void savePassword()
    return
  }
  // 文字/數字輸入
  const handleType = (s: { v: typeof username | typeof oldPassword }) => {
    // 僅允許英數底線，且長度上限 16
    // Backspace
    if (e.key === 'Backspace') {
      e.preventDefault()
      s.v.value = s.v.value.slice(0, -1)
      return true
    }
    // 字元
    if (/^[A-Za-z0-9_]$/.test(e.key)) {
      e.preventDefault()
      if (s.v.value.length < 16) s.v.value += e.key
      return true
    }
    return false
  }
  if (focus.value === 0) return void handleType({ v: username })
  if (focus.value === 1) return void handleType({ v: oldPassword })
  if (focus.value === 2) return void handleType({ v: newPassword })
  if (focus.value === 3) return void handleType({ v: confirmPassword })
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-sky-500 via-emerald-400 to-lime-400 text-black"
  >
    <div class="flex-1 p-2 text-sm space-y-2">
      <!-- Avatar + Username -->
      <div class="bg-white/70 rounded p-2 flex items-center gap-2">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          :style="{ backgroundColor: avatarColor }"
        >
          {{ avatarInitials }}
        </div>
        <div class="flex-1">
          <div class="text-[11px] opacity-70 mb-0.5">{{ t('profile.username') }}</div>
          <div
            class="rounded bg-white px-2 py-1"
            :class="focus === 0 ? 'ring-2 ring-black/50' : ''"
          >
            {{ username || t('profile.usernameHint') }}
          </div>
        </div>
        <button
          class="px-2 py-1 rounded bg-black/80 text-white"
          :class="focus === 4 ? 'ring-2 ring-white/70' : ''"
          @click="saveUsername"
        >
          {{ t('profile.save') }}
        </button>
      </div>

      <!-- Change password -->
      <div class="bg-white/70 rounded p-2 space-y-2">
        <div class="text-[11px] opacity-70">{{ t('profile.changePassword') }}</div>
        <div class="grid grid-cols-1 gap-1">
          <div
            class="rounded bg-white px-2 py-1"
            :class="focus === 1 ? 'ring-2 ring-black/50' : ''"
          >
            {{ t('profile.old') }}: {{ oldPassword.replace(/./g, '•') }}
          </div>
          <div
            class="rounded bg-white px-2 py-1"
            :class="focus === 2 ? 'ring-2 ring-black/50' : ''"
          >
            {{ t('profile.new') }}: {{ newPassword.replace(/./g, '•') }}
          </div>
          <div
            class="rounded bg-white px-2 py-1"
            :class="focus === 3 ? 'ring-2 ring-black/50' : ''"
          >
            {{ t('profile.confirm') }}: {{ confirmPassword.replace(/./g, '•') }}
          </div>
        </div>
        <div class="flex justify-end">
          <button
            class="px-2 py-1 rounded bg-black/80 text-white"
            :class="focus === 5 ? 'ring-2 ring-white/70' : ''"
            @click="savePassword"
          >
            {{ t('profile.update') }}
          </button>
        </div>
      </div>

      <div v-if="msg" class="text-center text-xs bg-black/70 text-white rounded p-1">{{ msg }}</div>
    </div>
  </div>
</template>
