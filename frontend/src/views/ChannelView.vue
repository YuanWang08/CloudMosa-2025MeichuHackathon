<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { channelsApi, messagesApi, ttsApi } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import type { ChannelWithQuickReplies, ChannelMessage } from '@/types/api'
import { renderMarkdown } from '@/lib/markdown'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()
const { t, locale } = useI18n()
const channelId = ref<string>(String(route.params.id))
const loading = ref(true)
const error = ref<string | null>(null)
const ch = ref<ChannelWithQuickReplies | null>(null)
const input = ref('')
const msgs = ref<ChannelMessage[]>([])
const unreadCountRef = ref(0)
const sending = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const sendBtnRef = ref<HTMLButtonElement | null>(null)
const messagesRef = ref<HTMLDivElement | null>(null)
const itemRefs = ref<Array<HTMLElement | null>>([])
const sentOverlay = ref(false)
const quickInputEnabled = ref(true)
const isOwnerRef = ref<boolean | undefined>(undefined)
const isEditing = ref(false)

const defaultQuick = ['✅', '❌', '⏰', '📢', '👍', '😢']
const quickEmojis = computed(() => {
  const favs = auth.user?.favoriteEmojis
  return favs && favs.length === 6 ? favs : defaultQuick
})
const customQuick = computed(() => ch.value?.ChannelQuickReplies ?? [])

function startEditing(initialChar?: string) {
  if (!isOwnerRef.value) return
  if (!isEditing.value) {
    isEditing.value = true
    nextTick(() => {
      const el = textareaRef.value
      if (!el) return
      el.focus()
      if (initialChar) {
        const start = el.selectionStart ?? el.value.length
        const end = el.selectionEnd ?? start
        el.setRangeText(initialChar, start, end, 'end')
        input.value = el.value
      } else {
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
    })
  } else {
    nextTick(() => {
      const el = textareaRef.value
      if (!el) return
      el.focus()
      if (initialChar) {
        const start = el.selectionStart ?? el.value.length
        const end = el.selectionEnd ?? start
        el.setRangeText(initialChar, start, end, 'end')
        input.value = el.value
      }
    })
  }
}

function stopEditing() {
  if (!isOwnerRef.value) return
  if (!isEditing.value) return
  isEditing.value = false
  const el = textareaRef.value
  if (el) {
    el.blur()
  }
  if (sendBtnRef.value && !sendBtnRef.value.disabled) {
    sendBtnRef.value.focus()
  }
}

// Owner info for header
const owner = computed(() => ch.value?.owner)
const ownerAvatarUrl = computed(() =>
  owner.value?.avatarImage ? `/avatars/${owner.value.avatarImage}` : null,
)
const ownerInitials = computed(() => owner.value?.avatarInitials ?? 'U')
const ownerColor = computed(() => owner.value?.avatarColor ?? '#4f46e5')
const ownerUsername = computed(() => (owner.value?.username ? `@${owner.value.username}` : ''))

// Joiner read-only selection + TTS state
const selectedIdx = ref(0)
const playingIdx = ref<number | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const isLoadingTts = ref(false)
const playProgress = ref(0)
const errorMsg = ref<string | null>(null)
let audio: HTMLAudioElement | null = null

function setItemRef(el: HTMLElement | null, idx: number) {
  itemRefs.value[idx] = el
}
function itemRefSetter(idx: number) {
  return (el: unknown) => setItemRef((el as HTMLElement) || null, idx)
}
function scrollSelectedIntoViewJoiner() {
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
async function playSelectedJoiner() {
  const m = msgs.value[selectedIdx.value]
  if (!m) return
  if (playingIdx.value !== null && playingIdx.value !== selectedIdx.value) stopAudio()
  errorMsg.value = null
  try {
    isLoadingTts.value = true
    playingIdx.value = selectedIdx.value
    const { url } = await ttsApi.synthesize(m.content, undefined, m.id)
    if (!audio) audio = new Audio()
    audio.onended = null
    audio.ontimeupdate = null
    audio.onloadedmetadata = null
    audio.onerror = null
    audio.src = url
    audio.onloadedmetadata = () => {
      isLoadingTts.value = false
    }
    audio.ontimeupdate = () => {
      if (!audio || !audio.duration || isNaN(audio.duration)) return
      playProgress.value = Math.min(1, Math.max(0, audio.currentTime / audio.duration))
    }
    audio.onended = () => {
      if (audio) {
        audio.onerror = null
      }
      stopAudio()
    }
    audio.onerror = () => {
      errorMsg.value = 'TTS failed'
      stopAudio()
    }
    await audio.play()
    isPlaying.value = true
    isPaused.value = false
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'TTS failed'
    stopAudio()
  }
}
function togglePauseResumeJoiner() {
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
    ch.value = await channelsApi.details(channelId.value)
    const ownerId = (ch.value as unknown as { ownerId?: string }).ownerId
    const isOwner = auth.user?.id && ownerId ? String(auth.user.id) === String(ownerId) : undefined
    isOwnerRef.value = isOwner
    ui.setContext({ page: 'channel', channelId: channelId.value, isOwner })
    // 擁有者：不載入歷史訊息（僅顯示輸入區）
    // 加入者：載入最近訊息，計算未讀數，並標記已讀
    if (isOwner === false) {
      try {
        // 先查詢未讀數（以第一次開啟時為準）
        try {
          const joined = await channelsApi.joined()
          const it = joined.find((c) => String(c.id) === String(channelId.value))
          const uc = it && 'unreadCount' in it ? (it as { unreadCount?: number }).unreadCount : 0
          unreadCountRef.value = Math.max(0, Number(uc || 0))
        } catch {}
        msgs.value = await messagesApi.list(channelId.value)
        await messagesApi.markRead(channelId.value)
        // 初始化選取到最新一則（索引 0）並滾入可視範圍
        selectedIdx.value = 0
        await nextTick()
        scrollSelectedIntoViewJoiner()
      } catch {}
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t('channel.loadFailed')
  } finally {
    loading.value = false
    await nextTick()
    if (isOwnerRef.value) startEditing()
    // 初始化軟鍵
    updateSoftkeys()
  }
}

async function send(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content || sending.value) return
  sending.value = true
  try {
    await messagesApi.send(channelId.value, content)
    input.value = ''
    // 發送成功顯示滿版頁面，並導向上一頁或對應清單
    sentOverlay.value = true
    setTimeout(() => {
      // 依身份導向：owner 回 Broadcast，非 owner 回 Message
      if (isOwnerRef.value) router.push('/broadcast')
      else router.push('/message')
    }, 900)
  } catch {
    // ignore inline
  } finally {
    sending.value = false
  }
}

function insertText(text: string, opts: { focus?: boolean } = {}) {
  if (!isOwnerRef.value) return
  const shouldFocus = opts.focus !== false
  if (shouldFocus && !isEditing.value) startEditing()
  // 快捷輸入：不自動加空格，直接附加文字
  input.value = input.value + text
  if (shouldFocus) {
    nextTick(() => {
      const el = textareaRef.value
      if (!el) return
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    })
  }
}

function useQuick(q: string) {
  insertText(q)
}

function updateSoftkeys() {
  // 非 owner 使用預設（RSK=Back 由 App 控制）
  if (!isOwnerRef.value) {
    ui.setSoftkeys(null)
    return
  }
  // 擁有者：RSK 一律為 Back；若有輸入內容則詢問捨棄
  ui.setSoftkeys({
    leftLabel: isEditing.value ? t('channel.done') : t('softkeys.menu'),
    showLeft: true,
    onLeft: () => {
      if (isEditing.value) {
        stopEditing()
      } else {
        ui.openMenu()
      }
    },
    rightLabel: t('softkeys.back'),
    showRight: true,
    onRight: async () => {
      if (input.value.trim().length > 0) {
        const ok = await ui.openConfirm(t('menu.confirmBackDiscard'))
        if (!ok) return
      }
      stopEditing()
      router.back()
    },
  })
}

watch(
  () => route.params.id,
  (v) => {
    channelId.value = String(v)
    load()
  },
)

// 監聽輸入與 owner 狀態變化，動態更新軟鍵
watch([input, isOwnerRef, isEditing], () => updateSoftkeys())
watch(locale, () => updateSoftkeys())

function onKey(e: KeyboardEvent) {
  if (ui.confirmOpen || ui.menuOpen) return
  // 若顯示成功覆蓋層，阻擋其他按鍵
  if (sentOverlay.value) {
    e.preventDefault()
    return
  }
  // 加入者為唯讀：上下鍵選擇訊息；Enter 播放/暫停；空白鍵暫停/繼續
  if (!isOwnerRef.value) {
    if (msgs.value.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      selectedIdx.value = (selectedIdx.value + dir + msgs.value.length) % msgs.value.length
      nextTick(scrollSelectedIntoViewJoiner)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (playingIdx.value === selectedIdx.value) togglePauseResumeJoiner()
      else playSelectedJoiner()
      return
    }
    if (e.key === ' ') {
      if (playingIdx.value !== null) {
        e.preventDefault()
        togglePauseResumeJoiner()
      }
      return
    }
    return
  }
  if (isOwnerRef.value) {
    const textareaEl = textareaRef.value
    const activeEl = document.activeElement as HTMLElement | null
    const textareaFocused = Boolean(textareaEl && activeEl === textareaEl)
    const sendFocused = activeEl === sendBtnRef.value
    const bodyFocused = activeEl === document.body

    if (!isEditing.value && textareaFocused) {
      isEditing.value = true
    }
    if (isEditing.value && !textareaFocused && !sendFocused) {
      isEditing.value = false
    }

    if (isEditing.value && e.key === 'Escape') {
      e.preventDefault()
      stopEditing()
      return
    }

    if (e.key === '0') {
      if (!isEditing.value) {
        e.preventDefault()
        quickInputEnabled.value = !quickInputEnabled.value
        return
      }
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault()
      quickInputEnabled.value = !quickInputEnabled.value
      if (isEditing.value) startEditing()
      return
    }

    if (e.key === 'ArrowDown') {
      if (isEditing.value && textareaFocused) {
        e.preventDefault()
        stopEditing()
        return
      }
    } else if (e.key === 'ArrowUp') {
      if (!isEditing.value && (sendFocused || bodyFocused)) {
        e.preventDefault()
        startEditing()
        return
      }
    }

    if (!isEditing.value) {
      if (e.key === 'Enter') {
        if (sendFocused) {
          if (input.value.trim()) {
            e.preventDefault()
            send()
          }
          return
        }
        e.preventDefault()
        startEditing()
        return
      }
      const isPrintable =
        e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
      const isQuickDigit = quickInputEnabled.value && e.key >= '1' && e.key <= '9'
      if (isPrintable && !isQuickDigit) {
        e.preventDefault()
        startEditing(e.key)
        return
      }
    }

    if (ui.confirmOpen || ui.menuOpen) return

    if (quickInputEnabled.value && e.key >= '1' && e.key <= '9') {
      const n = Number(e.key)
      if (n >= 1 && n <= 6) {
        e.preventDefault()
        insertText(quickEmojis.value[n - 1], { focus: false })
        return
      }
      if (n >= 7 && n <= 9) {
        const qr = customQuick.value.find((q) => q.index === n)
        if (qr) {
          e.preventDefault()
          insertText(qr.text, { focus: false })
          return
        }
      }
    }

    if (e.key === 'Enter') {
      if (isEditing.value && input.value.trim()) {
        e.preventDefault()
        send()
      }
      return
    }
    return
  }
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  ui.closeMenu()
  ui.setSoftkeys(null)
  stopAudio()
})
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-br from-pink-200 via-orange-200 to-yellow-200 text-black/80"
  >
    <!-- Local channel header (replaces global Broadcast/Message) -->
    <div class="p-3 text-sm opacity-90 flex items-center gap-2">
      <div
        class="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-white/20 grid place-items-center"
      >
        <img
          v-if="ownerAvatarUrl"
          :src="ownerAvatarUrl"
          alt="avatar"
          class="w-full h-full object-cover"
          referrerpolicy="no-referrer"
        />
        <span
          v-else
          class="text-[10px] font-semibold px-1 rounded"
          :style="{ backgroundColor: ownerColor }"
          >{{ ownerInitials }}</span
        >
      </div>
      <div class="min-w-0">
        <div class="font-semibold truncate">{{ ch?.title || t('channel.defaultTitle') }}</div>
        <div class="opacity-90 text-[11px] truncate">{{ ownerUsername }}</div>
      </div>
    </div>
    <div class="flex-1 p-2 pt-0 text-sm flex flex-col gap-2 overflow-hidden">
      <div v-if="loading" class="opacity-80">{{ t('common.loading') }}</div>
      <div v-else-if="error" class="text-red-200">{{ error }}</div>
      <template v-else>
        <div
          v-if="sentOverlay"
          class="absolute inset-0 z-20 flex items-center justify-center bg-black/70 text-white text-lg"
        >
          {{ t('channel.sentOverlay') }}
        </div>
        <!-- 擁有者：顯示輸入與快捷鍵 -->
        <template v-if="isOwnerRef">
          <textarea
            ref="textareaRef"
            v-model="input"
            class="w-full rounded border-2 border-white/80 bg-white/95 p-2 text-sm text-black shadow-sm focus:ring-1"
            rows="3"
            :placeholder="t('channel.inputPlaceholder')"
          />
          <button
            :disabled="sending || !input.trim()"
            class="w-full bg-amber-300 text-black rounded py-1 disabled:opacity-60"
            @click="send()"
            ref="sendBtnRef"
          >
            {{ t('channel.send') }}
          </button>

          <div class="mt-1">
            <div class="text-xs opacity-90">{{ t('channel.quickTitle') }}</div>
            <div class="grid grid-cols-6 gap-1 mt-1">
              <button
                v-for="(q, idx) in quickEmojis"
                :key="idx"
                class="relative bg-white/20 rounded p-1 text-base leading-none"
                @click="useQuick(q)"
              >
                <span
                  class="absolute -top-1 -right-1 bg-black/70 text-white rounded text-[10px] w-4 h-4 inline-flex items-center justify-center"
                  >{{ idx + 1 }}</span
                >
                {{ q }}
              </button>
            </div>
            <div v-if="customQuick.length" class="flex gap-1 mt-1">
              <button
                v-for="qr in customQuick"
                :key="qr.id"
                class="relative bg-white/20 rounded px-2 py-1 text-xs"
                @click="useQuick(qr.text)"
              >
                <span
                  class="absolute -top-1 -right-1 bg-black/70 text-white rounded text-[10px] w-4 h-4 inline-flex items-center justify-center"
                  >{{ qr.index }}</span
                >
                {{ qr.text }}
              </button>
            </div>
            <!-- Quick Input Switch -->
            <div class="mt-2 text-[11px] flex items-center justify-between">
              <div class="opacity-90">{{ t('channel.quickToggleLabel') }}</div>
              <div class="flex items-center gap-2">
                <span
                  :class="
                    quickInputEnabled ? 'bg-green-400 text-black' : 'bg-red-400 text-white'
                  "
                  class="rounded px-2 py-0.5"
                  >{{ quickInputEnabled ? t('channel.quickOn') : t('channel.quickOff') }}</span
                >
                <span class="opacity-80">{{ t('channel.quickToggleHint') }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 加入者：唯讀訊息列表（類似歷史頁） -->
        <template v-else>
          <div ref="messagesRef" class="flex-1 min-h-0 overflow-auto space-y-3">
            <div v-for="(m, idx) in msgs" :key="m.id" :ref="itemRefSetter(idx)">
              <!-- 分隔線：未讀與已讀的邊界（清單為新到舊，未讀在前） -->
              <div
                v-if="unreadCountRef > 0 && idx === unreadCountRef"
                class="text-[10px] uppercase tracking-wide text-black/80 flex items-center gap-2"
              >
                <span class="flex-1 h-px bg-black/40" />
                <span>{{ t('channel.earlier') }}</span>
                <span class="flex-1 h-px bg-black/40" />
              </div>
              <div
                class="rounded px-2 py-2 leading-[1.35] break-words text-black/80 relative"
                :class="[
                  idx < unreadCountRef ? 'bg-amber-300/20' : 'bg-white/30',
                  selectedIdx === idx ? 'ring-1 ring-black/50' : '',
                ]"
              >
                <div class="opacity-75 text-[10px] mb-0.5">
                  {{ new Date(m.createdAt).toLocaleString() }}
                </div>
                <div
                  class="prose-sm prose-invert max-w-none break-words whitespace-pre-wrap markdown-body"
                  v-html="renderMarkdown(m.content)"
                ></div>
                <!-- 未讀徽章（只在第一次打開該批未讀時顯示） -->
                <span
                  v-if="idx < unreadCountRef"
                  class="absolute top-1 right-1 bg-amber-400 text-black text-[10px] rounded px-1 py-0.5"
                  >{{ t('channel.newBadge') }}</span
                >
                <!-- 播放中進度條與狀態 -->
                <div
                  v-if="playingIdx === idx"
                  class="absolute left-1 right-1 bottom-1 h-1.5 rounded-full overflow-hidden bg-white/20 backdrop-blur-[1px]"
                >
                  <div
                    v-if="!isLoadingTts && playProgress > 0 && playProgress <= 1"
                    class="h-full rounded-full bg-gradient-to-br from-emerald-300 via-cyan-300 to-blue-300 transition-[width] duration-150 ease-linear shadow-[0_0_8px_rgba(255,255,255,0.35)]"
                    :style="{ width: (playProgress * 100).toFixed(2) + '%' }"
                  ></div>
                  <div
                    v-else
                    class="h-full animate-progressIndeterminate bg-gradient-to-br from-white/30 via-white/70 to-white/30"
                    style="width: 35%"
                  ></div>
                </div>
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
            </div>
            <div v-if="msgs.length === 0" class="opacity-80">{{ t('channel.emptyMessages') }}</div>
            <div v-if="errorMsg" class="text-red-200 text-xs">{{ errorMsg }}</div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.markdown-body {
  overflow-wrap: anywhere;
  word-break: break-word;
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
  margin: 0; /* tighter item spacing */
}

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

<style scoped>
@keyframes progressIndeterminate {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(300%);
  }
}
.animate-progressIndeterminate {
  animation: progressIndeterminate 1.2s infinite linear;
}
</style>
