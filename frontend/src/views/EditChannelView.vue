<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { channelsApi } from '@/lib/api'
import type { ChannelWithQuickReplies } from '@/types/api'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const id = String(route.params.id)
const loading = ref(true)
const error = ref<string | null>(null)
const title = ref('')
const allowJoin = ref(true)
const qrs = ref<string[]>(['', '', ''])

// feature phone navigation
const focusIndex = ref(0)
const titleRef = ref<HTMLInputElement | null>(null)
const allowRef = ref<HTMLInputElement | null>(null)
const qr1Ref = ref<HTMLInputElement | null>(null)
const qr2Ref = ref<HTMLInputElement | null>(null)
const qr3Ref = ref<HTMLInputElement | null>(null)
const saveRef = ref<HTMLButtonElement | null>(null)
const fields = [titleRef, allowRef, qr1Ref, qr2Ref, qr3Ref, saveRef]

async function load() {
  loading.value = true
  error.value = null
  try {
    const ch = (await channelsApi.details(id)) as ChannelWithQuickReplies
    title.value = ch.title
    allowJoin.value = ch.allowJoin
    const map = new Map((ch.ChannelQuickReplies || []).map((q) => [q.index, q.text]))
    qrs.value = [map.get(7) || '', map.get(8) || '', map.get(9) || '']
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function save() {
  loading.value = true
  error.value = null
  try {
    await channelsApi.update(id, {
      title: title.value,
      allowJoin: allowJoin.value,
      quickReplies: qrs.value,
    })
    router.push({ name: 'channel', params: { id } })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save'
  } finally {
    loading.value = false
  }
}

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
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // 切換 checkbox
    if (focusIndex.value === 1) {
      e.preventDefault()
      allowJoin.value = !allowJoin.value
    }
  } else if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
    // 在 checkbox 上時切換
    if (focusIndex.value === 1) {
      e.preventDefault()
      allowJoin.value = !allowJoin.value
      return
    }
    // 在儲存鍵上時提交
    if (focusIndex.value === fields.length - 1) {
      e.preventDefault()
      save()
    }
  }
}

onMounted(async () => {
  await load()
  await nextTick()
  focusAt(0)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-amber-400 via-rose-400 to-fuchsia-500 text-white"
  >
    <div class="flex-1 p-2 text-sm space-y-2">
      <div v-if="loading" class="opacity-80">Loading…</div>
      <div v-else-if="error" class="text-black">{{ error }}</div>
      <template v-else>
        <label class="text-xs">Title</label>
        <input ref="titleRef" v-model="title" class="w-full rounded px-2 py-1 text-black text-sm" />
        <label class="flex items-center gap-2 text-xs"
          ><input ref="allowRef" type="checkbox" v-model="allowJoin" /> Allow others to join</label
        >
        <div>
          <div class="text-xs opacity-90">Custom quick replies</div>
          <input
            ref="qr1Ref"
            v-model="qrs[0]"
            class="w-full rounded px-2 py-1 text-black text-sm mt-1"
            placeholder="Quick reply #1"
          />
          <input
            ref="qr2Ref"
            v-model="qrs[1]"
            class="w-full rounded px-2 py-1 text-black text-sm mt-1"
            placeholder="Quick reply #2"
          />
          <input
            ref="qr3Ref"
            v-model="qrs[2]"
            class="w-full rounded px-2 py-1 text-black text-sm mt-1"
            placeholder="Quick reply #3"
          />
        </div>
        <button ref="saveRef" class="w-full bg-emerald-300 text-black rounded py-1" @click="save">
          Save
        </button>
      </template>
    </div>
  </div>
</template>
