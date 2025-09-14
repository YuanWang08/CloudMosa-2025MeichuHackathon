<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { messagesApi, channelsApi } from '@/lib/api'
import type { ChannelMessage } from '@/types/api'
import { useUiStore } from '@/stores/ui'
import { renderMarkdown } from '@/lib/markdown'

const route = useRoute()
const ui = useUiStore()
const channelId = ref<string>(String(route.params.id))
const loading = ref(true)
const error = ref<string | null>(null)
const msgs = ref<ChannelMessage[]>([])
const listRef = ref<HTMLDivElement | null>(null)
const chTitle = ref('')
const chCode = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    const [msgsRes, chRes] = await Promise.all([
      messagesApi.list(channelId.value),
      channelsApi.details(channelId.value),
    ])
    msgs.value = msgsRes
    chTitle.value = chRes.title
    chCode.value = chRes.code
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  (v) => {
    channelId.value = String(v)
    load()
  },
)

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  // 上下鍵滾動
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const el = listRef.value
    if (!el) return
    e.preventDefault()
    const delta = e.key === 'ArrowDown' ? 24 : -24
    el.scrollTop = Math.max(0, el.scrollTop + delta)
    return
  }
}

onMounted(async () => {
  await load()
  await nextTick()
  listRef.value?.focus()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-fuchsia-500 via-indigo-500 to-cyan-500 text-white"
  >
    <div class="p-2 text-xs opacity-90">
      <div class="font-semibold truncate">{{ chTitle || 'Channel' }}</div>
      <div>
        Code: <span class="font-mono">{{ chCode || '------' }}</span>
      </div>
    </div>
    <div ref="listRef" tabindex="0" class="flex-1 content-scroll p-2 pt-0 text-sm outline-none">
      <div v-if="loading" class="opacity-80">Loading…</div>
      <div v-else-if="error" class="text-red-200">{{ error }}</div>
      <div v-else class="space-y-3">
        <div
          v-for="m in msgs"
          :key="m.id"
          class="bg-white/15 rounded px-2 py-2 leading-[1.35] break-words"
        >
          <div class="opacity-75 text-[10px] mb-0.5">
            {{ new Date(m.createdAt).toLocaleString() }}
          </div>
          <div
            class="prose-sm prose-invert max-w-none break-words markdown-body"
            v-html="renderMarkdown(m.content)"
          ></div>
        </div>
        <div v-if="msgs.length === 0" class="opacity-80">No messages yet.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Minimal markdown content styling */
.markdown-body {
  /* avoid horizontal scrolling: aggressively wrap long tokens */
  overflow-wrap: anywhere;
  word-break: break-word;
  /* match container text sizing & line height */
  line-height: inherit;
  font-size: inherit;
}
.markdown-body :deep(pre) {
  white-space: pre-wrap;
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 6px;
  border-radius: 4px;
}
.markdown-body :deep(code) {
  background: rgba(0, 0, 0, 0.25);
  padding: 0 2px;
  border-radius: 3px;
}
.markdown-body :deep(a) {
  color: #c2e7ff;
  text-decoration: underline;
  word-break: break-word;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.125rem 0; /* tighter block margin */
  list-style-position: outside;
}
.markdown-body :deep(ul) {
  list-style-type: disc;
}
.markdown-body :deep(ol) {
  list-style-type: decimal;
}
.markdown-body :deep(li) {
  margin: 0;
} /* tighter item spacing */

/* paragraphs & headings tighter spacing */
.markdown-body :deep(p) {
  margin: 0;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 0.25rem 0 0.125rem; /* small top/bottom */
  font-size: 1em; /* keep same size as body */
}
</style>
