<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (e: 'action', payload: { type: string }): void
}>()

const ui = useUiStore()
const { t } = useI18n()

const items = computed(() => {
  const ctx = ui.context
  // 主頁（README：加入頻道、建立頻道、設定）
  if (ctx.page === 'home' || ctx.page === 'broadcast' || ctx.page === 'message') {
    return [
      { key: 'join', label: t('menu.join') },
      { key: 'create', label: t('menu.create') },
      { key: 'settings', label: t('menu.settings') },
    ]
  }
  // 自己的頻道頁（頻道記錄、編輯頻道、刪除頻道）
  if (ctx.page === 'channel' && ctx.isOwner) {
    return [
      { key: 'history', label: t('menu.history') },
      { key: 'edit', label: t('menu.edit') },
      { key: 'remove', label: t('menu.remove') },
    ]
  }
  // 加入的頻道頁（退出頻道）
  if (ctx.page === 'channel' && !ctx.isOwner) {
    return [{ key: 'leave', label: t('menu.leave') }]
  }
  // 其他頁面可視需求擴充
  return []
})

function onPick(key: string) {
  emit('action', { type: key })
  ui.closeMenu()
}

const activeIndex = ref(0)
watch(
  () => ui.menuOpen,
  (open) => {
    if (open) activeIndex.value = 0
  },
)

function onKey(e: KeyboardEvent) {
  if (!ui.menuOpen) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % items.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + items.value.length) % items.value.length
  } else if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
    e.preventDefault()
    const it = items.value[activeIndex.value]
    if (it) onPick(it.key)
  } else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
    e.preventDefault()
    ui.closeMenu()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="ui.menuOpen" class="absolute inset-0 z-20">
    <div class="absolute inset-0 bg-black/50" @click="ui.closeMenu()" />
    <div class="absolute bottom-10 left-2 right-2 bg-white text-black rounded shadow">
      <ul>
        <li
          v-for="(it, idx) in items"
          :key="it.key"
          class="px-3 py-2 border-b last:border-b-0"
          :class="idx === activeIndex ? 'bg-neutral-100' : ''"
          @click="onPick(it.key)"
        >
          {{ it.label }}
        </li>
      </ul>
    </div>
  </div>
  <!-- 區域內遮罩式選單，適配 QQVGA/QVGA -->
</template>

<style scoped></style>
