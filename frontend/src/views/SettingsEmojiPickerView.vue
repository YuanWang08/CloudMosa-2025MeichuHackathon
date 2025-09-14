<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { emojiApi, type EmojiCatalog } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()

const slotIndex = Number(route.query.slot || 0)
const loading = ref(true)
const error = ref<string | null>(null)
const catalog = ref<EmojiCatalog | null>(null)
const catIdx = ref(0)
// focus model: header has two focusable buttons (prev=headerIndex -1, next=headerIndex -2)
const headerFocus = ref<0 | 1 | null>(null) // null => grid focused; 0=left arrow; 1=right arrow
const leftBtnRef = ref<HTMLButtonElement | null>(null)
const rightBtnRef = ref<HTMLButtonElement | null>(null)
const gridIndex = ref(0)
const btnRefs = ref<Array<HTMLButtonElement | null>>([])
function setRef(el: HTMLButtonElement | null, idx: number) {
  btnRefs.value[idx] = el
}
function onItemRef(el: unknown, idx: number) {
  setRef((el as HTMLButtonElement) || null, idx)
}
function focusActive() {
  if (headerFocus.value === 0) {
    leftBtnRef.value?.focus()
    return
  }
  if (headerFocus.value === 1) {
    rightBtnRef.value?.focus()
    return
  }
  btnRefs.value[gridIndex.value]?.focus()
}

const cats = computed(() => catalog.value?.categories ?? [])
const items = computed(() => cats.value[catIdx.value]?.items ?? [])

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await emojiApi.catalog()
    catalog.value = data
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
    await nextTick()
    focusActive()
  }
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  if (e.key === 'F12' || e.key === 'Escape') {
    e.preventDefault()
    router.back()
    return
  }
  // Left/Right
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    if (headerFocus.value !== null) {
      // 當前在標題箭頭：左右鍵切分類
      if (cats.value.length === 0) return
      if (e.key === 'ArrowLeft')
        catIdx.value = (catIdx.value - 1 + cats.value.length) % cats.value.length
      else catIdx.value = (catIdx.value + 1) % cats.value.length
      gridIndex.value = 0
      return
    }
    // Grid 模式：左右在列內移動；若在最左/最右則切換分類
    const cols = 6
    const count = items.value.length
    if (count === 0) return
    const col = gridIndex.value % cols
    if (e.key === 'ArrowLeft') {
      if (col > 0) {
        gridIndex.value = gridIndex.value - 1
      } else if (cats.value.length > 0) {
        // 最左再按左：上一分類
        catIdx.value = (catIdx.value - 1 + cats.value.length) % cats.value.length
        gridIndex.value = 0
      }
    } else {
      if (col < cols - 1 && gridIndex.value + 1 < count) {
        gridIndex.value = gridIndex.value + 1
      } else if (cats.value.length > 0) {
        // 最右再按右：下一分類
        catIdx.value = (catIdx.value + 1) % cats.value.length
        gridIndex.value = 0
      }
    }
    nextTick(focusActive)
    return
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    const cols = 6
    // header <-> grid 切換
    if (headerFocus.value !== null) {
      if (e.key === 'ArrowDown') {
        const targetCol = headerFocus.value === 0 ? 0 : 5
        headerFocus.value = null
        gridIndex.value = Math.min(items.value.length - 1, targetCol)
        nextTick(focusActive)
      }
      return
    }
    if (e.key === 'ArrowUp') {
      if (gridIndex.value - cols >= 0) {
        gridIndex.value = gridIndex.value - cols
      } else {
        // 從第一列上移：左三欄到左鍵頭，右三欄到右鍵頭
        const col = gridIndex.value % cols
        headerFocus.value = col <= 2 ? 0 : 1
      }
    } else {
      // 往下
      const next = gridIndex.value + cols
      if (next <= items.value.length - 1) gridIndex.value = next
    }
    nextTick(focusActive)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    // 若在標題箭頭，Enter 直接下移到對應欄位的第一個 emoji
    if (headerFocus.value !== null) {
      const targetCol = headerFocus.value === 0 ? 0 : 5
      headerFocus.value = null
      gridIndex.value = Math.min(items.value.length - 1, targetCol)
      nextTick(focusActive)
      return
    }
    const it = items.value[gridIndex.value]
    if (!it) return
    choose(it.emoji)
  }
}

async function choose(emoji: string) {
  try {
    const current =
      auth.user?.favoriteEmojis && auth.user.favoriteEmojis.length === 6
        ? [...auth.user.favoriteEmojis]
        : ['✅', '❌', '⏰', '📢', '👍', '😢']
    current[slotIndex] = emoji
    await emojiApi.updateFavorites(current)
    auth.setFavorites(current)
    // 返回上一頁
    router.back()
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-rose-500 via-orange-400 to-yellow-300 text-black"
  >
    <div class="flex-1 content-scroll p-2 text-sm">
      <div v-if="loading">Loading…</div>
      <div v-else-if="error" class="text-red-600">{{ error }}</div>
      <template v-else>
        <div class="mb-2 flex items-center justify-center gap-2 text-xs">
          <button
            ref="leftBtnRef"
            class="rounded px-2 py-1 bg-white/70"
            :class="headerFocus === 0 ? 'ring-2 ring-black' : ''"
            @click="catIdx = (catIdx - 1 + cats.length) % cats.length"
            @focus="headerFocus = 0"
            @blur="headerFocus = null"
          >
            ◀️
          </button>
          <div class="font-medium text-center">{{ cats[catIdx]?.name }}</div>
          <button
            ref="rightBtnRef"
            class="rounded px-2 py-1 bg-white/70"
            :class="headerFocus === 1 ? 'ring-2 ring-black' : ''"
            @click="catIdx = (catIdx + 1) % cats.length"
            @focus="headerFocus = 1"
            @blur="headerFocus = null"
          >
            ▶️
          </button>
        </div>
        <div class="grid grid-cols-6 gap-1">
          <button
            v-for="(it, idx) in items"
            :key="it.id"
            :ref="
              (el) => {
                headerFocus = null
                onItemRef(el, idx)
              }
            "
            class="rounded bg-white/80 py-1 text-xl flex items-center justify-center"
            :class="gridIndex === idx ? 'ring-2 ring-black' : ''"
            @click="choose(it.emoji)"
            @focus="gridIndex = idx"
          >
            {{ it.emoji }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.content-scroll {
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--softkey-h, 48px);
}
</style>
