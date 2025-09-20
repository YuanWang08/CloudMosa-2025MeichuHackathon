<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { messagesApi, channelsApi, ttsApi } from '@/lib/api'
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
const itemRefs = ref<Array<HTMLElement | null>>([])
const chTitle = ref('')
const chCode = ref('')

// selection & tts state
const selectedIdx = ref(0)
const playingIdx = ref<number | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const isLoadingTts = ref(false)
const playProgress = ref(0) // 0..1
let audio: HTMLAudioElement | null = null

function setItemRef(el: unknown, idx: number) {
  const node = (el as HTMLElement) || null
  itemRefs.value[idx] = node
}
function itemRefSetter(idx: number) {
  return (el: unknown) => setItemRef(el, idx)
}
function scrollSelectedIntoView() {
  const el = itemRefs.value[selectedIdx.value]
  if (!el) return
  el.scrollIntoView({ block: 'nearest' })
}

function resetAudioState() {
  isPlaying.value = false
  isPaused.value = false
  isLoadingTts.value = false
  playProgress.value = 0
  playingIdx.value = null
}

function stopAudio() {
  try {
    if (audio) {
      audio.pause()
      audio.src = ''
      audio.load()
    }
  } catch {}
  resetAudioState()
}

async function playSelected() {
  const m = msgs.value[selectedIdx.value]
  if (!m) return
  // 若正在播其他訊息，先停止
  if (playingIdx.value !== null && playingIdx.value !== selectedIdx.value) stopAudio()
  try {
    isLoadingTts.value = true
    playingIdx.value = selectedIdx.value
    const { url } = await ttsApi.synthesize(m.content, undefined, m.id)
    // 建立或重用 audio
    if (!audio) audio = new Audio()
    // 清理舊監聽
    audio.onended = null
    audio.ontimeupdate = null
    audio.onloadedmetadata = null
    audio.onerror = null

    audio.src = url
    audio.onloadedmetadata = () => {
      isLoadingTts.value = false
    }
    audio.ontimeupdate = () => {
      if (!audio || !audio.duration || isNaN(audio.duration)) {
        // duration 不可用則維持不定狀態（UI 會顯示活躍動畫）
        return
      }
      playProgress.value = Math.min(1, Math.max(0, audio.currentTime / audio.duration))
    }
    audio.onended = () => {
      stopAudio()
    }
    audio.onerror = () => {
      stopAudio()
    }
    await audio.play()
    isPlaying.value = true
    isPaused.value = false
  } catch {
    stopAudio()
  }
}

function togglePauseResume() {
  if (!audio || playingIdx.value === null) return
  if (isPaused.value) {
    audio.play().catch(() => {})
    isPaused.value = false
    isPlaying.value = true
  } else {
    audio.pause()
    isPaused.value = true
    isPlaying.value = false
  }
}

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
  // 上下鍵：移動選取並自動捲動入視
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (msgs.value.length === 0) return
    e.preventDefault()
    const dir = e.key === 'ArrowDown' ? 1 : -1
    selectedIdx.value = (selectedIdx.value + dir + msgs.value.length) % msgs.value.length
    nextTick(scrollSelectedIntoView)
    return
  }
  // Enter：播放或暫停/繼續
  if (e.key === 'Enter') {
    e.preventDefault()
    if (playingIdx.value === selectedIdx.value) {
      togglePauseResume()
    } else {
      playSelected()
    }
    return
  }
  // 空白鍵：暫停/繼續（若正在播放）
  if (e.key === ' ') {
    if (playingIdx.value !== null) {
      e.preventDefault()
      togglePauseResume()
    }
    return
  }
}

onMounted(async () => {
  await load()
  await nextTick()
  listRef.value?.focus()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  stopAudio()
})
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-br from-pink-200 via-orange-200 to-yellow-200 text-white"
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
          v-for="(m, idx) in msgs"
          :key="m.id"
          :ref="itemRefSetter(idx)"
          class="relative rounded px-2 py-2 leading-[1.35] break-words"
          :class="['bg-white/15', selectedIdx === idx ? 'ring-2 ring-white/70' : 'ring-0']"
        >
          <div class="opacity-75 text-[10px] mb-0.5">
            {{ new Date(m.createdAt).toLocaleString() }}
          </div>
          <div
            class="prose-sm prose-invert max-w-none break-words markdown-body"
            v-html="renderMarkdown(m.content)"
          ></div>

          <!-- 播放中進度條：融合在卡片底部 -->
          <div
            v-if="playingIdx === idx"
            class="absolute left-1 right-1 bottom-1 h-1.5 rounded-full overflow-hidden bg-white/20 backdrop-blur-[1px]"
          >
            <div
              v-if="!isLoadingTts && playProgress > 0 && playProgress <= 1 && !isNaN(playProgress)"
              class="h-full rounded-full bg-gradient-to-br from-emerald-300 via-cyan-300 to-blue-300 transition-[width] duration-150 ease-linear shadow-[0_0_8px_rgba(255,255,255,0.35)]"
              :style="{ width: (playProgress * 100).toFixed(2) + '%' }"
            ></div>
            <!-- 不定狀態（剛開始、或無 duration）顯示 shimmer -->
            <div
              v-else
              class="h-full animate-progressIndeterminate bg-gradient-to-br from-white/30 via-white/70 to-white/30"
              style="width: 35%"
            ></div>
          </div>

          <!-- 播放狀態小圖示（右上角） -->
          <div v-if="playingIdx === idx" class="absolute top-1 right-1 text-[10px]">
            <span
              :class="[
                'inline-flex items-center justify-center w-4 h-4 rounded-full',
                isPaused ? 'bg-white/30' : 'bg-emerald-300 text-black',
              ]"
              >{{ isPaused ? '⏸' : '▶' }}</span
            >
          </div>
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

/* 進度條不定態動畫 */
@keyframes progressIndeterminate {
  0% {
    transform: translateX(-120%);
  }
  60% {
    transform: translateX(80%);
  }
  100% {
    transform: translateX(120%);
  }
}
.animate-progressIndeterminate {
  animation: progressIndeterminate 1.2s ease-in-out infinite;
}
</style>
