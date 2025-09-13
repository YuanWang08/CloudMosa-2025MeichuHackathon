<script setup lang="ts">
import IconMenu from './icons/IconMenu.vue'
import IconBack from './icons/IconBack.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  leftLabel?: string
  rightLabel?: string
  showLeft?: boolean
  showRight?: boolean
}>()

defineEmits<{
  (e: 'left'): void
  (e: 'right'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="softkey-bar">
    <button class="sk-btn left" v-if="showLeft !== false" @click="$emit('left')">
      <IconMenu class="icon" />
      <span class="label">{{ leftLabel ?? t('softkeys.menu', 'Menu') }}</span>
    </button>
    <div class="spacer" />
    <button class="sk-btn right" v-if="showRight !== false" @click="$emit('right')">
      <span class="label">{{ rightLabel ?? t('softkeys.back', 'Back') }}</span>
      <IconBack class="icon" />
    </button>
  </div>
  <div class="softkey-safe" />
  <!-- spacer to not hide content -->
</template>

<style scoped>
.softkey-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 32px;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 0 6px;
}
.softkey-safe {
  height: 32px;
}
.sk-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: inherit;
  background: transparent;
  border: none;
  font-size: 12px;
}
.left {
  justify-content: flex-start;
}
.right {
  justify-content: flex-end;
}
.spacer {
  flex: 1;
}
.icon {
  width: 14px;
  height: 14px;
}
</style>
