<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { channelsApi } from '@/lib/api'
import type { Channel } from '@/types/api'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const ui = useUiStore()
const loading = ref(true)
const error = ref<string | null>(null)
const mine = ref<Channel[]>([])
const activeIndex = ref(0)
const itemRefs = ref<Array<HTMLElement | null>>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    mine.value = await channelsApi.mine()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

function openChannel(id: string) {
  ui.closeMenu()
  router.push({ name: 'channel', params: { id } })
}

function setItemRef(el: HTMLElement | null, idx: number) {
  itemRefs.value[idx] = el
}

function scrollSelectedIntoView() {
  const el = itemRefs.value[activeIndex.value]
  if (!el) return
  el.scrollIntoView({ block: 'nearest' })
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (mine.value.length === 0) return
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    activeIndex.value = (activeIndex.value + dir + mine.value.length) % mine.value.length
    nextTick(scrollSelectedIntoView)
    return
  }
  if (e.key === 'Enter') {
    if (mine.value.length === 0) return
    e.preventDefault()
    const id = mine.value[activeIndex.value].id
    openChannel(id)
    return
  }
}

onMounted(async () => {
  await load()
  await nextTick()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-indigo-600 via-purple-500 to-pink-500 text-white"
  >
    <!-- Header removed for background color distinction -->
    <div class="flex-1 p-2 overflow-auto text-sm">
      <div v-if="loading" class="opacity-80">Loading…</div>
      <div v-else-if="error" class="text-red-200">{{ error }}</div>
      <ul v-else class="space-y-2">
        <li
          v-for="(c, idx) in mine"
          :key="c.id"
          :ref="(el) => setItemRef(el as HTMLElement | null, idx)"
          class="rounded p-2 flex items-center justify-between"
          :class="activeIndex === idx ? 'bg-white/25 ring-1 ring-white/50' : 'bg-white/15'"
        >
          <span class="truncate">{{ c.title }}</span>
          <button
            class="bg-amber-300 text-black rounded px-2 py-1 text-xs"
            @click="openChannel(c.id)"
          >
            Open
          </button>
        </li>
        <li v-if="mine.length === 0" class="opacity-80">No channels. Create one from Home.</li>
      </ul>
    </div>
  </div>
</template>
