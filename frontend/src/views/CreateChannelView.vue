<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { channelsApi } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useDisableMenu } from '@/composables/useDisableMenu'

const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()
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

const templateOptions = [
  {
    key: 'elder',
    labelKey: 'create.templateElder',
    quickReplies: ['已吃藥，身體無異狀', '我很好，請放心', '我找不到我的藥'],
  },
  {
    key: 'child',
    labelKey: 'create.templateChild',
    quickReplies: ['我到學校了！', '我到家了！', '爸比媽咪救我！'],
  },
  { key: 'custom', labelKey: 'create.templateCustom', quickReplies: ['', '', ''] },
]

const templateRefs = templateOptions.map(() => ref<HTMLButtonElement | null>(null))
const selectedTemplate = ref<string>('custom')

const fields = [...templateRefs, titleRef, allowRef, qr1Ref, qr2Ref, qr3Ref, submitRef]

useDisableMenu()

function templateRefSetter(idx: number) {
  return (el: unknown) => {
    templateRefs[idx].value = (el as HTMLButtonElement) || null
  }
}

function applyTemplate(key: string) {
  const tpl = templateOptions.find((t) => t.key === key)
  selectedTemplate.value = key
  if (!tpl) return
  const [q1, q2, q3] = tpl.quickReplies
  qr1.value = q1 || ''
  qr2.value = q2 || ''
  qr3.value = q3 || ''
}

function handleTemplateFocus(idx: number, key: string) {
  focusIndex.value = idx
  if (selectedTemplate.value !== key) applyTemplate(key)
}

function focusAt(i: number) {
  focusIndex.value = (i + fields.length) % fields.length
  const el = fields[focusIndex.value].value
  if (el) el.focus()
}

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  if (templateRefs.some((r, idx) => fields[focusIndex.value] === r)) {
    const tplIdx = templateRefs.findIndex((r) => fields[focusIndex.value] === r)
    if (tplIdx >= 0) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const dir = e.key === 'ArrowRight' ? 1 : -1
        const next = (tplIdx + dir + templateRefs.length) % templateRefs.length
        focusAt(next)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        applyTemplate(templateOptions[tplIdx].key)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusAt(templateRefs.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusAt(templateRefs.length - 1)
        return
      }
    }
  }
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
  const defaultTitle = auth.user?.username ? `${auth.user.username}'s Channel` : "User's Channel"
  title.value = defaultTitle
  applyTemplate('custom')
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
    class="h-full flex flex-col bg-gradient-to-br from-yellow-200 via-orange-200 to-blue-200 text-black"
  >
    <div class="flex-1 content-scroll p-2 text-sm space-y-2">
      <div>
        <div class="text-sm opacity-80 mt-1">{{ $t('create.template') }}</div>
        <div class="flex gap-2 mt-1">
          <button
            v-for="(tpl, idx) in templateOptions"
            :key="tpl.key"
            :ref="templateRefSetter(idx)"
            class="px-2 py-1 rounded border text-xs"
            :class="
              selectedTemplate === tpl.key
                ? 'bg-black/20 text-black shadow border-transparent'
                : 'bg-white/60 text-black/80 border-transparent'
            "
            @click="applyTemplate(tpl.key)"
            @focus="handleTemplateFocus(idx, tpl.key)"
          >
            {{ $t(tpl.labelKey) }}
          </button>
        </div>
      </div>
      <label class="text-xs">{{ $t('create.title') }}</label>
      <input
        ref="titleRef"
        v-model="title"
        class="w-full border rounded px-2 py-1 text-xs text-black"
        :placeholder="$t('create.title')"
      />
      <label class="flex items-center gap-2 text-xs">
        <input ref="allowRef" type="checkbox" v-model="allowJoin" /> {{ $t('create.allowJoin') }}
      </label>
      <div>
        <div class="text-sm opacity-80 mt-2">Quick replies</div>
        <input
          ref="qr1Ref"
          v-model="qr1"
          class="w-full rounded px-2 py-1 text-sm text-black mt-1"
          :placeholder="$t('create.quickPlaceholder', { index: 1 })"
        />
        <input
          ref="qr2Ref"
          v-model="qr2"
          class="w-full rounded px-2 py-1 text-sm text-black mt-1"
          :placeholder="$t('create.quickPlaceholder', { index: 2 })"
        />
        <input
          ref="qr3Ref"
          v-model="qr3"
          class="w-full rounded px-2 py-1 text-sm text-black mt-1"
          :placeholder="$t('create.quickPlaceholder', { index: 3 })"
        />
      </div>
      <button
        ref="submitRef"
        :disabled="loading"
        class="w-full bg-[#8E8E8E] text-white rounded py-1 focus:opacity-60"
        @click="createChannel"
      >
        {{ $t('create.submit') }}
      </button>
      <div v-if="error" class="text-rose-600">{{ error }}</div>
    </div>
  </div>
</template>
