<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { channelsApi } from '@/lib/api'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const ui = useUiStore()
const code = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// feature phone navigation
const focusIndex = ref(0)
const codeRef = ref<HTMLInputElement | null>(null)
const submitRef = ref<HTMLButtonElement | null>(null)
const fields = [codeRef, submitRef]

function focusAt(i: number) {
  focusIndex.value = (i + fields.length) % fields.length
  const el = fields[focusIndex.value].value
  if (el) el.focus()
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
    if (focusIndex.value === fields.length - 1) {
      e.preventDefault()
      join()
    }
  }
}

onMounted(async () => {
  await nextTick()
  focusAt(0)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

async function join() {
  const v = code.value.trim()
  if (!v) return
  loading.value = true
  error.value = null
  try {
    await channelsApi.join(v)
    // 加入成功後前往 Message 分頁，以時間排序顯示新頻道在最上方
    router.push('/message')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to join'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-br from-lime-200 via-amber-100 to-rose-200 text-black"
  >
    <div class="flex-1 content-scroll p-3 text-[12px]">
      <label class="font-bold opacity-60">Channel ID</label>
      <input
        ref="codeRef"
        v-model="code"
        class="mt-1 w-full rounded px-2 py-1 border focus:outline-none"
        placeholder="6 digits"
      />
      <button
        ref="submitRef"
        :disabled="loading"
        class="mt-2 w-full bg-black/70 text-white rounded py-1 focus:opacity-50"
        @click="join"
      >
        Join
      </button>
      <div v-if="error" class="text-red-700 mt-2">{{ error }}</div>
    </div>
  </div>
</template>
