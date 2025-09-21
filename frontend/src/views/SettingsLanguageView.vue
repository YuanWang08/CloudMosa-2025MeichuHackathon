<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, watch } from 'vue'
import { setLocale, SUPPORT_LOCALES } from '@/i18n'
import { useUiStore } from '@/stores/ui'
import { useDisableMenu } from '@/composables/useDisableMenu'
import { useI18n } from 'vue-i18n'

const ui = useUiStore()
const options = SUPPORT_LOCALES
const { t, locale } = useI18n()
const active = ref(Math.max(0, options.indexOf(locale.value as (typeof SUPPORT_LOCALES)[number])))
const itemRefs = ref<Array<HTMLButtonElement | null>>([])

useDisableMenu()

function setRef(el: HTMLButtonElement | null, idx: number) {
  itemRefs.value[idx] = el
}
function focusActive() {
  itemRefs.value[active.value]?.focus()
}

function onItemRef(el: unknown, idx: number) {
  setRef((el as HTMLButtonElement) || null, idx)
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    active.value = (active.value + dir + options.length) % options.length
    nextTick(focusActive)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    choose(options[active.value])
  }
}

async function choose(loc: (typeof SUPPORT_LOCALES)[number]) {
  await setLocale(loc)
  active.value = options.indexOf(loc)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextTick(() => {
    active.value = Math.max(0, options.indexOf(locale.value as (typeof SUPPORT_LOCALES)[number]))
    focusActive()
  })
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

watch(locale, (val) => {
  const idx = options.indexOf(val as (typeof SUPPORT_LOCALES)[number])
  if (idx >= 0) active.value = idx
})
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-br from-pink-200 via-orange-100 to-yellow-200 text-black"
  >
    <div class="flex-1 p-2 text-sm">
      <ul class="space-y-2">
        <li v-for="(loc, idx) in options" :key="loc">
          <button
            :ref="(el) => onItemRef(el, idx)"
            class="w-full text-left rounded px-2 py-2"
          :class="active === idx ? 'bg-black/20' : 'bg-white/70'"
          @click="choose(loc)"
        >
          {{ t(`languages.${loc}`) }}
        </button>
      </li>
    </ul>
  </div>
</div>
</template>
