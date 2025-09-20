<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const err = ref('')
const ui = useUiStore()

// 鍵盤導覽
const focusIndex = ref(0) // 0=username, 1=password, 2=signup, 3=signin
const userRef = ref<HTMLInputElement | null>(null)
const passRef = ref<HTMLInputElement | null>(null)
const signupRef = ref<HTMLButtonElement | null>(null)
const signinRef = ref<HTMLButtonElement | null>(null)

function focusAt(i: number) {
  const arr = [userRef, passRef, signupRef, signinRef]
  focusIndex.value = (i + arr.length) % arr.length
  const el = arr[focusIndex.value].value
  el?.focus()
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusAt(focusIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusAt(focusIndex.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (focusIndex.value === 2) onSubmit()
    else if (focusIndex.value === 3) router.push('/signin')
  }
}

onMounted(async () => {
  await nextTick()
  focusAt(0)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function validate(u: string, p: string) {
  const re = /^[A-Za-z0-9_]{6,16}$/
  if (!re.test(u)) return t('auth.invalidUsername')
  if (!re.test(p)) return t('auth.invalidPassword')
  return ''
}

async function onSubmit() {
  err.value = validate(username.value, password.value)
  if (err.value) return
  loading.value = true
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Sign up failed')
    auth.setAuth(data.token, data.user)
    // 註冊後隨機賦予一張 avatarImage（不顯示清單，純隨機）
    try {
      const mRes = await fetch('/avatars/manifest.json', { cache: 'no-cache' })
      if (mRes.ok) {
        const list = (await mRes.json()) as string[]
        if (Array.isArray(list) && list.length > 0) {
          const pick = list[Math.floor(Math.random() * list.length)]
          // 以新 token 更新個人資料的 avatarImage
          await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
            body: JSON.stringify({ username: data.user.username, avatarImage: pick }),
          })
          // 重新讀取 me 以更新前端使用者資料
          await auth.me()
        }
      }
    } catch {
      /* 忽略隨機頭像失敗，不影響註冊流程 */
    }
    router.replace('/broadcast')
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-yellow-100 via-green-100 to-blue-200 text-white"
  >
    <div class="flex-1 p-4 flex flex-col gap-1">
      <label class="text-sm text-black/60 font-semibold">{{ t('auth.username') }}</label>
      <input
        ref="userRef"
        v-model="username"
        class="rounded bg-/70 px-2 py-1 text-black text-xs border border-black/20"
        :placeholder="t('auth.usernamePlaceholder')"
      />
      <label class="text-sm text-black/60 font-semibold">{{ t('auth.password') }}</label>
      <input
        ref="passRef"
        v-model="password"
        type="password"
        class="rounded bg-/70 px-2 py-1 text-black text-xs border border-black/20"
        :placeholder="t('auth.passwordPlaceholder')"
      />
      <p v-if="err" class="text-xs text-rose-400">{{ err }}</p>
      <button
        ref="signupRef"
        :disabled="loading"
        @click="onSubmit"
        class="mt-5 bg-orange-300 focus:bg-orange-400 text-white rounded py-1 text-sm"
      >
        {{ loading ? t('common.loading') : t('auth.signUp') }}
      </button>
      <button
        ref="signinRef"
        @click="router.push('/signin')"
        class="mt-1 bg-white/60 focus:bg-black/10 rounded py-1 text-yellow-500 hover:text-yellow-400 text-sm"
      >
        {{ t('auth.toSignIn') }}
      </button>
    </div>
  </div>
</template>

<style scoped></style>
