<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { channelsApi } from '@/lib/api'
import type { Channel } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const loading = ref(true)
const error = ref<string | null>(null)
const list = ref<Channel[]>([])
const activeIndex = ref(0)
const listRef = ref<HTMLUListElement | null>(null)
const itemRefs = ref<Array<HTMLElement | null>>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const joined = await channelsApi.joined()
    // 僅顯示加入的頻道，且排除自己擁有的
    const myId = auth.user?.id
    list.value = joined.filter((c) => (myId ? String(c.ownerId) !== String(myId) : true))
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

const hasAny = computed(() => list.value.length > 0)

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
  // 僅在 Message 主頁處理
  // 上/下鍵：移動選取
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (list.value.length === 0) return
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    activeIndex.value = (activeIndex.value + dir + list.value.length) % list.value.length
    nextTick(scrollSelectedIntoView)
    return
  }
  // Enter：進入選取的頻道（Z 保留給 Menu）
  if (e.key === 'Enter') {
    if (list.value.length === 0) return
    e.preventDefault()
    const id = list.value[activeIndex.value].id
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
    class="h-full flex flex-col bg-gradient-to-br from-pink-200 via-orange-200 to-yellow-200 text-white"
  >
    <div class="flex-1 p-2 overflow-auto text-sm">
      <div v-if="loading" class="opacity-80">Loading…</div>
      <div v-else-if="error" class="text-red-200">{{ error }}</div>
      <ul v-else ref="listRef" class="space-y-2">
        <li
          v-for="(c, idx) in list"
          :key="c.id"
          :ref="(el) => setItemRef(el as HTMLElement | null, idx)"
          class="rounded p-2 flex items-center justify-between gap-2"
          :class="activeIndex === idx ? 'bg-white/25 ring-1 ring-white/50' : 'bg-white/15'"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div
              class="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-white/20 grid place-items-center"
            >
              <img
                v-if="c.owner?.avatarImage"
                :src="'/avatars/' + c.owner.avatarImage"
                alt="avatar"
                class="w-full h-full object-cover"
                referrerpolicy="no-referrer"
              />
              <span
                v-else
                class="text-[10px] font-semibold px-1 rounded"
                :style="{ backgroundColor: c.owner?.avatarColor || '#4f46e5' }"
                >{{ c.owner?.avatarInitials || 'U' }}</span
              >
            </div>
            <span class="truncate">{{ c.title }}</span>
          </div>
          <button
            class="relative bg-amber-300 text-black rounded px-2 py-1 text-xs"
            @click="openChannel(c.id)"
          >
            Open
            <span
              v-if="Number(c.unreadCount || 0) > 0"
              class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"
              aria-label="unread"
            />
          </button>
        </li>
        <li v-if="!hasAny" class="opacity-80">No joined channels yet. Join from Home.</li>
      </ul>
    </div>
  </div>
</template>
