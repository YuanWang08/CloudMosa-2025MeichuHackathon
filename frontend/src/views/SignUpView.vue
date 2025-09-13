<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const err = ref('')

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
    class="h-full flex flex-col bg-gradient-to-b from-cyan-500 via-violet-500 to-fuchsia-500 text-white"
  >
    <div class="flex-1 p-3 flex flex-col gap-2">
      <label class="text-xs">{{ t('auth.username') }}</label>
      <input
        v-model="username"
        class="rounded px-2 py-1 text-black text-sm"
        :placeholder="t('auth.usernamePlaceholder')"
      />
      <label class="text-xs">{{ t('auth.password') }}</label>
      <input
        v-model="password"
        type="password"
        class="rounded px-2 py-1 text-black text-sm"
        :placeholder="t('auth.passwordPlaceholder')"
      />
      <p v-if="err" class="text-xs text-yellow-200">{{ err }}</p>
      <button
        :disabled="loading"
        @click="onSubmit"
        class="mt-2 bg-amber-300 hover:bg-amber-400 active:bg-amber-500 text-black rounded py-1 text-sm"
      >
        {{ loading ? t('common.loading') : t('auth.signUp') }}
      </button>
      <button
        @click="router.push('/signin')"
        class="bg-white/20 hover:bg-white/30 rounded py-1 text-sm"
      >
        {{ t('auth.toSignIn') }}
      </button>
    </div>
  </div>
</template>

<style scoped></style>
