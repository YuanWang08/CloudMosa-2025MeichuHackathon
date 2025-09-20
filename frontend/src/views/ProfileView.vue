<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'
import { useDisableMenu } from '@/composables/useDisableMenu'

const auth = useAuthStore()
const ui = useUiStore()
const { t } = useI18n()

useDisableMenu()

// 顯示資料
const username = ref(auth.user?.username || '')
const avatarInitials = computed(() => auth.user?.avatarInitials || 'U')
const avatarColor = computed(() => auth.user?.avatarColor || '#4f46e5')
const avatarImage = ref<string | null>(auth.user?.avatarImage || null)

// 密碼欄位
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 焦點順序（由上而下可視順序）：
// 0=username, 1=randomAvatar, 2=saveUsername, 3=oldPwd, 4=newPwd, 5=confirmPwd, 6=savePassword
const focus = ref(0)
const msg = ref<string>('')
const avatarRef = ref<HTMLDivElement | null>(null)
const usernameRef = ref<HTMLDivElement | null>(null)
const saveUserRef = ref<HTMLButtonElement | null>(null)
const oldRef = ref<HTMLInputElement | null>(null)
const newRef = ref<HTMLInputElement | null>(null)
const confirmRef = ref<HTMLInputElement | null>(null)
const savePwdRef = ref<HTMLButtonElement | null>(null)

// 用於自動捲動/聚焦的元素陣列（順序需對應焦點索引）
const focusEls = [avatarRef, usernameRef, saveUserRef, oldRef, newRef, confirmRef, savePwdRef]

function scrollToFocus() {
  const el = focusEls[focus.value]?.value
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function focusDom() {
  const el = focusEls[focus.value]?.value as HTMLElement | undefined
  if (el && typeof el.focus === 'function') {
    el.focus()
  }
}

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
    body: JSON.stringify({ username: username.value, avatarImage: avatarImage.value || undefined }),
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

  // 上下移動
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    focus.value = Math.max(0, Math.min(focusEls.length - 1, focus.value + dir))
    nextTick(() => {
      focusDom()
      scrollToFocus()
    })
    return
  }

  // avatar 區塊 → 左右切換
  if (focus.value === 0) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      changeAvatar(-1)
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      changeAvatar(1)
      return
    }
  }

  // Enter 操作
  if (e.key === 'Enter') {
    e.preventDefault()
    if (focus.value === 2) return void saveUsername()
    if (focus.value === 6) return void savePassword()
  }

  // 輸入處理
  const handleType = (s: { v: typeof username | typeof oldPassword }) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      s.v.value = s.v.value.slice(0, -1)
      return true
    }
    if (/^[A-Za-z0-9_]$/.test(e.key)) {
      e.preventDefault()
      if (s.v.value.length < 16) s.v.value += e.key
      return true
    }
    return false
  }

  if (focus.value === 1) return void handleType({ v: username })
  if (focus.value === 3) return void handleType({ v: oldPassword })
  if (focus.value === 4) return void handleType({ v: newPassword })
  if (focus.value === 5) return void handleType({ v: confirmPassword })
}

const avatarList = ref<string[]>([])
const avatarIndex = ref<number>(-1)

async function loadAvatarList() {
  try {
    const res = await fetch('/avatars/manifest.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error('manifest not found')
    const list = (await res.json()) as string[]
    avatarList.value = Array.isArray(list) ? list : []
    // Set initial index based on current avatarImage
    if (avatarImage.value && avatarList.value.length) {
      avatarIndex.value = avatarList.value.indexOf(avatarImage.value)
    } else {
      avatarIndex.value = 0
      avatarImage.value = avatarList.value[0] || null
    }
  } catch (e) {
    avatarList.value = []
    avatarIndex.value = -1
  }
}

function changeAvatar(dir: number) {
  if (!avatarList.value.length) return
  let idx = avatarIndex.value
  idx = (idx + dir + avatarList.value.length) % avatarList.value.length
  avatarIndex.value = idx
  avatarImage.value = avatarList.value[idx]
  setMessage(t('profile.msg.saved'))
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextTick(() => {
    focusDom()
    scrollToFocus()
  })
  loadAvatarList()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
// 隨機挑選頭像：從 /avatars/manifest.json 讀取檔名清單（前端 public 目錄）
async function randomizeAvatar() {
  try {
    const res = await fetch('/avatars/manifest.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error('manifest not found')
    const list = (await res.json()) as string[]
    if (!Array.isArray(list) || list.length === 0) throw new Error('empty manifest')
    const pick = list[Math.floor(Math.random() * list.length)]
    avatarImage.value = pick
    setMessage(t('profile.msg.saved'))
  } catch (e) {
    console.error(e)
    setMessage('Avatar list not available')
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-br from-pink-200 via-yellow-100 to-blue-100 text-black"
  >
    <div class="flex-1 content-scroll p-3 text-xs space-y-3">
      <!-- Avatar + Username -->
      <div class="bg-white/70 rounded p-3">
        <div class="grid grid-cols-[auto,auto,1fr,auto] items-center gap-2">
          <div class="flex items-center justify-center">
            <div
              ref="avatarRef"
              tabindex="-1"
              class="flex items-center justify-center"
              :class="focus === 0 ? 'ring-2 ring-black/50' : ''"
            >
            <button class="px-1 py-1 text-black focus:font-bold" :disabled="!avatarList.length">
              <
            </button>
            <div class="w-10 h-10 aspect-square shrink-0 mx-1">
              <img
                v-if="avatarImage"
                :src="`/avatars/${avatarImage}`"
                alt="avatar"
                class="w-full h-full rounded-full object-cover"
              />
              <div
                v-else
                class="w-full h-full rounded-full flex items-center justify-center text-white font-bold"
                :style="{ backgroundColor: avatarColor }"
              >
                {{ avatarInitials }}
              </div>
            </div>
            <button class="px-1 py-1 text-black font-bold" :disabled="!avatarList.length">
              >
            </button>
          </div>
          </div>
          <div class="min-w-0">
            <div class="text-[12px] font-bold opacity-60 mb-1.5">{{ t('profile.username') }}</div>
            <div
              ref="usernameRef"
              tabindex="-1"
              class="rounded bg-white border px-2 py-1 min-h-[28px] overflow-hidden text-ellipsis whitespace-nowrap focus:outline-none"
              :class="focus === 0 ? 'ring-2 ring-black/50' : ''"
            >
              {{ username || t('profile.usernameHint') }}
            </div>
          </div>
          <button
            ref="saveUserRef"
            class="px-3 py-1 rounded bg-[#8E8E8E] text-white border border-black/20 shrink-0"
            :class="focus === 2 ? 'ring-2 ring-black' : ''"
            @click="saveUsername"
          >
            {{ t('profile.save') }}
          </button>
        </div>
      </div>

      <!-- Change password -->
      <div class="bg-white/70 rounded p-3 space-y-2">
        <div class="grid grid-cols-[auto,auto,1fr,auto] items-center gap-2">
        <div class="text-[12px] font-bold opacity-60">{{ t('profile.changePassword') }}</div>
        <div class="grid grid-cols-1 gap-1">
          <input
            ref="oldRef"
            type="password"
            v-model="oldPassword"
            :placeholder="t('profile.old')"
            class="rounded bg-white px-2 py-1 border focus:outline-none"
            :class="focus === 3 ? 'ring-2 ring-black/50' : ''"
          />
          <input
            ref="newRef"
            type="password"
            v-model="newPassword"
            :placeholder="t('profile.new')"
            class="rounded bg-white px-2 py-1 border focus:outline-none"
            :class="focus === 4 ? 'ring-2 ring-black/50' : ''"
          />
          <input
            ref="confirmRef"
            type="password"
            v-model="confirmPassword"
            :placeholder="t('profile.confirm')"
            class="rounded bg-white px-2 py-1 border focus:outline-none"
            :class="focus === 5 ? 'ring-2 ring-black/50' : ''"
          />
        </div>
        <button
            ref="savePwdRef"
            class="px-3 py-1 rounded bg-[#8E8E8E] text-white border border-black/20 shrink-0"
            :class="focus === 6 ? 'ring-2 ring-black' : ''"
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
