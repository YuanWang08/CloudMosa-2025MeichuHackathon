<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { channelsApi, messagesApi } from '@/lib/api'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import type { ChannelWithQuickReplies, ChannelMessage } from '@/types/api'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const auth = useAuthStore()
const channelId = ref<string>(String(route.params.id))
const loading = ref(true)
const error = ref<string | null>(null)
const ch = ref<ChannelWithQuickReplies | null>(null)
const input = ref('')
const msgs = ref<ChannelMessage[]>([])
const unreadCountRef = ref(0)
const sending = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const messagesRef = ref<HTMLDivElement | null>(null)
const sentOverlay = ref(false)
const quickInputEnabled = ref(true)
const isOwnerRef = ref<boolean | undefined>(undefined)

const defaultQuick = ['✅', '❌', '⏰', '📢', '👍', '😢']
const customQuick = computed(() => ch.value?.ChannelQuickReplies ?? [])

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
      } catch {}
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
    await nextTick()
    if (isOwnerRef.value) textareaRef.value?.focus()
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

function insertText(text: string) {
  // 將文字插入 textarea 尾端，並加空格分隔
  const sep = input.value && !/\s$/.test(input.value) ? ' ' : ''
  input.value = input.value + sep + text
  nextTick(() => textareaRef.value?.focus())
}

function useQuick(q: string) {
  insertText(q)
}

watch(
  () => route.params.id,
  (v) => {
    channelId.value = String(v)
    load()
  },
)

function onKey(e: KeyboardEvent) {
  // 若顯示成功覆蓋層，阻擋其他按鍵
  if (sentOverlay.value) {
    e.preventDefault()
    return
  }
  // 加入者為唯讀：提供上下鍵滾動訊息列表
  if (!isOwnerRef.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const el = messagesRef.value
      if (!el) return
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 24 : -24
      el.scrollTop = Math.max(0, el.scrollTop + delta)
    }
    return
  }
  // 快速輸入開關：0 或 S 鍵切換
  if (e.key === '0' || e.key === 's' || e.key === 'S') {
    e.preventDefault()
    quickInputEnabled.value = !quickInputEnabled.value
    nextTick(() => textareaRef.value?.focus())
    return
  }

  // 數字鍵 1~9 對應預設與自訂 quick replies（僅在開啟快速輸入時）
  if (ui.confirmOpen || ui.menuOpen) return
  if (quickInputEnabled.value && e.key >= '1' && e.key <= '9') {
    const n = Number(e.key)
    if (n >= 1 && n <= 6) {
      e.preventDefault()
      insertText(defaultQuick[n - 1])
      return
    }
    if (n >= 7 && n <= 9) {
      const qr = customQuick.value.find((q) => q.index === n)
      if (qr) {
        e.preventDefault()
        insertText(qr.text)
        return
      }
    }
  }
  if (e.key === 'Enter') {
    // Enter 預設送出（若有內容）
    if (input.value.trim()) {
      e.preventDefault()
      send()
    }
  }
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  ui.closeMenu()
})
</script>

<template>
  <div
    class="h-full flex flex-col bg-gradient-to-b from-indigo-500 via-teal-400 to-emerald-400 text-white"
  >
    <div class="flex-1 p-2 text-sm flex flex-col gap-2 overflow-hidden">
      <div v-if="loading" class="opacity-80">Loading…</div>
      <div v-else-if="error" class="text-red-200">{{ error }}</div>
      <template v-else>
        <div
          v-if="sentOverlay"
          class="absolute inset-0 z-20 flex items-center justify-center bg-black/70 text-white text-lg"
        >
          Sent ✓
        </div>
        <!-- 擁有者：顯示輸入與快捷鍵 -->
        <template v-if="isOwnerRef">
          <textarea
            ref="textareaRef"
            v-model="input"
            class="w-full rounded p-1 text-sm text-black"
            rows="3"
            placeholder="Type your message"
          />
          <button
            :disabled="sending || !input.trim()"
            class="w-full bg-amber-300 text-black rounded py-1 disabled:opacity-60"
            @click="send()"
          >
            Send
          </button>

          <div class="mt-1">
            <div class="text-xs opacity-90">Quick</div>
            <div class="grid grid-cols-6 gap-1 mt-1">
              <button
                v-for="(q, idx) in defaultQuick"
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
              <div class="opacity-90">Quick Input Switch</div>
              <div class="flex items-center gap-2">
                <span
                  :class="
                    quickInputEnabled ? 'bg-emerald-300 text-black' : 'bg-white/30 text-white'
                  "
                  class="rounded px-2 py-0.5"
                  >{{ quickInputEnabled ? 'ON' : 'OFF' }}</span
                >
                <span class="opacity-80">Press 0 or S to toggle</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 加入者：唯讀訊息列表（類似歷史頁） -->
        <template v-else>
          <div ref="messagesRef" class="flex-1 min-h-0 overflow-auto space-y-3">
            <template v-for="(m, idx) in msgs" :key="m.id">
              <!-- 分隔線：未讀與已讀的邊界（清單為新到舊，未讀在前） -->
              <div
                v-if="unreadCountRef > 0 && idx === unreadCountRef"
                class="text-[10px] uppercase tracking-wide text-white/80 flex items-center gap-2"
              >
                <span class="flex-1 h-px bg-white/40" />
                <span>Earlier</span>
                <span class="flex-1 h-px bg-white/40" />
              </div>

              <div
                class="rounded px-2 py-2 leading-[1.35] break-words text-white relative"
                :class="
                  idx < unreadCountRef ? 'bg-amber-300/20 ring-1 ring-amber-300' : 'bg-white/15'
                "
              >
                <div class="opacity-75 text-[10px] mb-0.5">
                  {{ new Date(m.createdAt).toLocaleString() }}
                </div>
                <div class="whitespace-pre-wrap">{{ m.content }}</div>
                <!-- 未讀徽章（只在第一次打開該批未讀時顯示） -->
                <span
                  v-if="idx < unreadCountRef"
                  class="absolute top-1 right-1 bg-amber-400 text-black text-[10px] rounded px-1 py-0.5"
                  >NEW</span
                >
              </div>
            </template>
            <div v-if="msgs.length === 0" class="opacity-80">No messages yet.</div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
