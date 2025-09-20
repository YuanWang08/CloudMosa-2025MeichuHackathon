<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { emojiApi } from '@/lib/api'
import { useDisableMenu } from '@/composables/useDisableMenu'

const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()

useDisableMenu()

const defaults = ['✅', '❌', '⏰', '📢', '👍', '😢']
const slots = ref<string[]>(
  auth.user?.favoriteEmojis && auth.user.favoriteEmojis.length === 6
    ? [...auth.user.favoriteEmojis]
    : [...defaults],
)

// keyboard focus
const active = ref(0) // 0..5 slots, 6 = Save
const btnRefs = ref<Array<HTMLButtonElement | null>>([])
function setRef(el: HTMLButtonElement | null, idx: number) {
  btnRefs.value[idx] = el
}
function onItemRef(el: unknown, idx: number) {
  setRef((el as HTMLButtonElement) || null, idx)
}
function focusActive() {
  btnRefs.value[active.value]?.focus()
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  if (
    e.key === 'ArrowRight' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowDown' ||
    e.key === 'ArrowUp'
  ) {
    e.preventDefault()
    const total = 7
    const cols = 3
    if (e.key === 'ArrowRight') active.value = (active.value + 1) % total
    else if (e.key === 'ArrowLeft') active.value = (active.value - 1 + total) % total
    else if (e.key === 'ArrowDown') active.value = Math.min(6, active.value + cols)
    else if (e.key === 'ArrowUp') active.value = Math.max(0, active.value - cols)
    nextTick(focusActive)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    activate(active.value)
    return
  }
}

function openPicker(idx: number) {
  // 導向挑選器，透過 query 帶入 slot index
  router.push({ path: '/settings/emoji/picker', query: { slot: String(idx) } })
}

async function saveAll() {
  try {
    const favs = slots.value
    await emojiApi.updateFavorites(favs)
    auth.setFavorites(favs)
    // 簡單提示
    await ui.openConfirm('Saved', true)
    router.back()
  } catch (err) {
    console.error(err)
    await ui.openConfirm('Failed', true)
  }
}

function activate(idx: number) {
  if (idx >= 0 && idx < 6) {
    openPicker(idx)
    return
  }
  if (idx === 6) {
    saveAll()
  }
}

onMounted(() => {
  if (!auth.user?.favoriteEmojis || auth.user.favoriteEmojis.length !== 6) {
    slots.value = [...defaults]
  } else {
    slots.value = [...(auth.user.favoriteEmojis as string[])]
  }
  window.addEventListener('keydown', onKey)
  nextTick(() => {
    active.value = 0
    focusActive()
  })
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-teal-500 via-cyan-400 to-sky-400 text-black"
  >
    <div class="flex-1 content-scroll p-2 text-sm">
      <div class="text-xs opacity-80 mb-1">Select your 6 favorite emojis</div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(e, idx) in slots"
          :key="idx"
          :ref="(el) => onItemRef(el, idx)"
          class="relative rounded px-3 py-3 text-2xl bg-white/80 flex items-center justify-center"
          :class="active === idx ? 'ring-2 ring-black' : ''"
          @click="openPicker(idx)"
          @focus="active = idx"
        >
          <span
            class="absolute -top-1 -right-1 bg-black/80 text-white text-[10px] rounded w-4 h-4 inline-flex items-center justify-center"
            >{{ idx + 1 }}</span
          >
          {{ e }}
        </button>
      </div>
      <div class="mt-3">
        <button
          :ref="(el) => onItemRef(el, 6)"
          class="w-full rounded py-2 text-sm"
          :class="active === 6 ? 'bg-black/20' : 'bg-white/80'"
          @click="saveAll"
          @focus="active = 6"
        >
          Save
        </button>
      </div>
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
