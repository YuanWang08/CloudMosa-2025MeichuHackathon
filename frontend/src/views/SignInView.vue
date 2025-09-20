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
const focusIndex = ref(0) // 0=username, 1=password, 2=signin, 3=signup
const userRef = ref<HTMLInputElement | null>(null)
const passRef = ref<HTMLInputElement | null>(null)
const signinRef = ref<HTMLButtonElement | null>(null)
const signupRef = ref<HTMLButtonElement | null>(null)

function focusAt(i: number) {
  const arr = [userRef, passRef, signinRef, signupRef]
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
    else if (focusIndex.value === 3) router.push('/signup')
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Login failed')
    auth.setAuth(data.token, data.user)
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
    class="h-full flex flex-col bg-gradient-to-t from-yellow-200 via-green-100 to-blue-100 text-white"
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
        ref="signinRef"
        :disabled="loading"
        @click="onSubmit"
        class="mt-5 bg-[#0066CC]/80 focus:bg-[#0066CC]/90 text-white rounded py-1 text-sm"
      >
        {{ loading ? t('common.loading') : t('auth.signIn') }}
      </button>
      <button
        ref="signupRef"
        @click="router.push('/signup')"
        class="mt-1 bg-white/60 focus:bg-black/10 rounded py-1 text-[#0066CC]/60 focus: text-[#0066CC]/80 text-sm"
      >
        {{ t('auth.toSignUp') }}
      </button>
    </div>
  </div>
</template>

<style scoped></style>
