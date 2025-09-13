<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useI18n } from 'vue-i18n'

const ui = useUiStore()
const { t } = useI18n()

function onKey(e: KeyboardEvent) {
  if (!ui.confirmOpen) return
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    ui.toggleConfirmSelection()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    ui.chooseConfirm(ui.confirmSelectedYes)
  } else if (e.key === 'Escape' || e.key === 'Backspace') {
    e.preventDefault()
    ui.chooseConfirm(false)
  } else if (e.key === 'z' || e.key === 'Z') {
    e.preventDefault()
    ui.chooseConfirm(true)
  } else if (e.key === 'x' || e.key === 'X') {
    e.preventDefault()
    ui.chooseConfirm(false)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="ui.confirmOpen" class="absolute inset-0 z-30">
    <div class="absolute inset-0 bg-black/60" />
    <div class="absolute left-3 right-3 top-1/3 bg-white text-black rounded shadow p-3 text-sm">
      <div class="mb-3">{{ ui.confirmMessage }}</div>
      <div class="flex gap-2 justify-end">
        <button
          :class="[
            'px-3 py-1 rounded',
            ui.confirmSelectedYes ? 'bg-black text-white' : 'bg-neutral-200',
          ]"
          @click="ui.chooseConfirm(true)"
        >
          {{ t('common.yes', 'Yes') }}
        </button>
        <button
          :class="[
            'px-3 py-1 rounded',
            !ui.confirmSelectedYes ? 'bg-black text-white' : 'bg-neutral-200',
          ]"
          @click="ui.chooseConfirm(false)"
        >
          {{ t('common.no', 'No') }}
        </button>
      </div>
    </div>
  </div>
  <!-- 覆蓋在畫面上方的簡易對話框，符合 QQVGA/QVGA -->
</template>

<style scoped></style>
