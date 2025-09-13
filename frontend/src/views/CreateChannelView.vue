<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { channelsApi } from '@/lib/api'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const ui = useUiStore()
const title = ref('')
const allowJoin = ref(true)
const qr1 = ref('')
const qr2 = ref('')
const qr3 = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// feature phone navigation
const focusIndex = ref(0)
const titleRef = ref<HTMLInputElement | null>(null)
const allowRef = ref<HTMLInputElement | null>(null)
const qr1Ref = ref<HTMLInputElement | null>(null)
const qr2Ref = ref<HTMLInputElement | null>(null)
const qr3Ref = ref<HTMLInputElement | null>(null)
const submitRef = ref<HTMLButtonElement | null>(null)

const fields = [titleRef, allowRef, qr1Ref, qr2Ref, qr3Ref, submitRef]

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
    // 在 checkbox 上時切換
    if (focusIndex.value === 1) {
      e.preventDefault()
      allowJoin.value = !allowJoin.value
      return
    }
    // 提交（當前在提交按鈕時）
    if (focusIndex.value === fields.length - 1) {
      e.preventDefault()
      createChannel()
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // 切換 checkbox
    if (focusIndex.value === 1) {
      e.preventDefault()
      allowJoin.value = !allowJoin.value
    }
  }
}

onMounted(async () => {
  await nextTick()
  focusAt(0)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

async function createChannel() {
  const t = title.value.trim()
  if (!t) return
  loading.value = true
  error.value = null
  try {
    const ch = await channelsApi.create({
      title: t,
      allowJoin: allowJoin.value,
      quickReplies: [qr1.value, qr2.value, qr3.value].filter(Boolean),
    })
    router.push({ name: 'channel', params: { id: ch.id } })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-emerald-400 via-sky-400 to-indigo-400 text-white"
  >
    <div class="flex-1 content-scroll p-2 text-sm space-y-2">
      <label class="text-xs">Title</label>
      <input
        ref="titleRef"
        v-model="title"
        class="w-full rounded px-2 py-1 text-sm text-black"
        placeholder="Channel title"
      />
      <label class="flex items-center gap-2 text-xs">
        <input ref="allowRef" type="checkbox" v-model="allowJoin" /> Allow others to join
      </label>
      <div>
        <div class="text-xs opacity-90">Custom quick replies</div>
        <input
          ref="qr1Ref"
          v-model="qr1"
          class="w-full rounded px-2 py-1 text-sm text-black mt-1"
          placeholder="Quick reply #1 (optional)"
        />
        <input
          ref="qr2Ref"
          v-model="qr2"
          class="w-full rounded px-2 py-1 text-sm text-black mt-1"
          placeholder="Quick reply #2 (optional)"
        />
        <input
          ref="qr3Ref"
          v-model="qr3"
          class="w-full rounded px-2 py-1 text-sm text-black mt-1"
          placeholder="Quick reply #3 (optional)"
        />
      </div>
      <button
        ref="submitRef"
        :disabled="loading"
        class="w-full bg-white text-black rounded py-1 disabled:opacity-60"
        @click="createChannel"
      >
        Create
      </button>
      <div v-if="error" class="text-rose-200">{{ error }}</div>
    </div>
  </div>
</template>
