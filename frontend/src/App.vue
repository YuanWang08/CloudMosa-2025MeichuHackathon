<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import SoftkeyBar from '@/components/SoftkeyBar.vue'
import OptionsMenu from '@/components/OptionsMenu.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { channelsApi } from '@/lib/api'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const { t } = useI18n()
const isAuthPage = computed(
  () => route.path.startsWith('/signin') || route.path.startsWith('/signup'),
)
const isMainPage = computed(
  () =>
    !isAuthPage.value &&
    (route.path === '/' ||
      route.path.startsWith('/broadcast') ||
      route.path.startsWith('/message')),
)

function isEditableTarget(e: KeyboardEvent): boolean {
  const el = (e.target as HTMLElement) || (document.activeElement as HTMLElement | null)
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  if (tag === 'textarea')
    return !(el as HTMLTextAreaElement).readOnly && !(el as HTMLTextAreaElement).disabled
  if (tag === 'input') {
    const inp = el as HTMLInputElement
    const type = (inp.type || 'text').toLowerCase()
    const textLike = ['text', 'search', 'email', 'password', 'number', 'url', 'tel']
    return textLike.includes(type) && !inp.readOnly && !inp.disabled
  }
  // contenteditable
  if (el.isContentEditable) return true
  return false
}

// 當確認框用鍵盤關閉後，避免接下來的一次 keyup 對底層元件產生 click
let swallowNextDecisionKeyUp = false

// 最高優先（捕獲階段）攔截：確認框開啟時消化決策鍵，避免其他 handler 介入
function onPreKeydown(e: KeyboardEvent) {
  if (!ui.confirmOpen) return
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    e.stopPropagation()
    // 左右切換選項
    ui.toggleConfirmSelection()
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    ui.chooseConfirm(ui.confirmSelectedYes)
    swallowNextDecisionKeyUp = true
    return
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    ui.chooseConfirm(true)
    swallowNextDecisionKeyUp = true
    return
  }
  if (e.key === 'F12' || e.key === 'Backspace') {
    e.preventDefault()
    e.stopPropagation()
    ui.chooseConfirm(false)
    swallowNextDecisionKeyUp = true
    return
  }
}

function onLeft() {
  if (ui.confirmOpen) {
    ui.chooseConfirm(true)
    swallowNextDecisionKeyUp = true
    return
  }
  // 歷史/加入頁隱藏 Menu：按 LSK 無反應
  if (ui.context.page === 'history' || ui.context.page === 'join') return
  if (isAuthPage.value) return
  // 開啟 Options Menu
  ui.openMenu()
}
async function onRight() {
  if (ui.confirmOpen) {
    ui.chooseConfirm(false)
    swallowNextDecisionKeyUp = true
    return
  }
  if (isAuthPage.value || isMainPage.value) return
  // 建立/頻道頁返回確認
  if (
    route.path.startsWith('/create') ||
    route.path.startsWith('/join') ||
    route.path.startsWith('/edit') ||
    (route.path.startsWith('/channel/') && ui.context.isOwner)
  ) {
    const ok = await ui.openConfirm(t('menu.confirmBackDiscard'))
    if (!ok) return
  }
  router.back()
}

async function onKeydown(e: KeyboardEvent) {
  // 確認框優先：Escape=LSK(Yes)、F12=RSK(No)
  if (ui.confirmOpen) {
    if (e.key === 'Enter') {
      e.preventDefault()
      ui.chooseConfirm(ui.confirmSelectedYes)
      swallowNextDecisionKeyUp = true
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      ui.chooseConfirm(true)
      swallowNextDecisionKeyUp = true
      return
    }
    if (e.key === 'F12' || e.key === 'Backspace') {
      e.preventDefault()
      ui.chooseConfirm(false)
      swallowNextDecisionKeyUp = true
      return
    }
  }

  // 全域 LSK/RSK 映射（避免在確認框/選單/認證頁觸發）
  // LSK: Escape → onLeft；RSK: F12 → onRight
  if (!ui.menuOpen && !ui.confirmOpen && !isAuthPage.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      // 若有頁面自訂 onLeft，優先使用
      if (ui.softkeys?.onLeft) ui.softkeys.onLeft()
      else onLeft()
      return
    }
    if (e.key === 'F12') {
      e.preventDefault()
      // 若有頁面自訂 onRight，優先使用
      if (ui.softkeys?.onRight) ui.softkeys.onRight()
      else onRight()
      return
    }
  }
  if (ui.confirmOpen || ui.menuOpen) return
  if (isAuthPage.value) return
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && isMainPage.value) {
    e.preventDefault()
    const target = e.key === 'ArrowLeft' ? '/broadcast' : '/message'
    if (!route.path.startsWith(target)) router.push(target)
  }
  // Back 動作：改用 F12（RSK）觸發；保留 Backspace 當作硬體返回鍵替代
  if (e.key === 'Backspace') {
    // 若正在輸入欄位中，交給瀏覽器做刪字，不做返回
    if (isEditableTarget(e)) return
    // 首頁詢問是否要離開
    if (isMainPage.value) {
      e.preventDefault()
      const ok = await ui.openConfirm(t('menu.exitApp'))
      if (ok) window.close()
      return
    }
    // 表單/編輯頁離開捨棄確認
    if (
      route.path.startsWith('/create') ||
      route.path.startsWith('/join') ||
      route.path.startsWith('/edit')
    ) {
      e.preventDefault()
      const ok = await ui.openConfirm(t('menu.confirmBackDiscard'))
      if (ok) router.back()
      return
    }
    // 頻道（擁有者）返回：依右軟鍵狀態決定
    if (route.path.startsWith('/channel/') && ui.context.isOwner) {
      e.preventDefault()
      // 若頁面已將右軟鍵設為 Back，直接使用 onRight（立即返回）
      if (ui.softkeys?.rightLabel === 'Back' && ui.softkeys.onRight) {
        ui.softkeys.onRight()
      } else {
        // 其他情況（多半為 Send），給返回捨棄確認
        const ok = await ui.openConfirm(t('menu.confirmBackDiscard'))
        if (ok) router.back()
      }
      return
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onPreKeydown, { capture: true })
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onPreKeydown, { capture: true })
  window.removeEventListener('keydown', onKeydown)
})

// 另外攔截 keyup，避免 Enter keyup 觸發底層按鈕 click（例如 Logout）
function onKeyup(e: KeyboardEvent) {
  // 若剛從確認框關閉，吞掉這次 keyup，避免觸發底層 button click
  if (
    swallowNextDecisionKeyUp &&
    (e.key === 'Enter' || e.key === 'Escape' || e.key === 'F12' || e.key === 'Backspace')
  ) {
    e.preventDefault()
    e.stopPropagation()
    swallowNextDecisionKeyUp = false
    return
  }
  if (!ui.confirmOpen) return
  if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'F12' || e.key === 'Backspace') {
    e.preventDefault()
    e.stopPropagation()
  }
}
const useCapture = true
onMounted(() => window.addEventListener('keyup', onKeyup, { capture: useCapture }))
onBeforeUnmount(() => window.removeEventListener('keyup', onKeyup, { capture: useCapture }))

// 根據路由變化設定 UI 上下文
watch(
  () => route.fullPath,
  () => {
    if (isAuthPage.value) {
      ui.setContext({ page: route.path.includes('signup') ? 'signup' : 'signin' })
      return
    }
    if (route.path === '/') ui.setContext({ page: 'home' })
    else if (route.path.startsWith('/broadcast')) ui.setContext({ page: 'broadcast' })
    else if (route.path.startsWith('/message')) ui.setContext({ page: 'message' })
    else if (route.path.startsWith('/create')) ui.setContext({ page: 'create' })
    else if (route.path.startsWith('/join')) {
      ui.setContext({ page: 'join' })
      ui.closeMenu()
    } else if (route.path.startsWith('/settings/language')) ui.setContext({ page: 'language' })
    else if (route.path.startsWith('/settings')) ui.setContext({ page: 'settings' })
    else if (route.path.startsWith('/history/')) ui.setContext({ page: 'history' })
    else if (route.path.startsWith('/edit/')) ui.setContext({ page: 'edit' })
    else if (route.path.startsWith('/channel/')) {
      const id = String(route.params.id)
      // owner 狀態由 ChannelView 動態更新
      ui.setContext({ page: 'channel', channelId: id, isOwner: undefined })
    }
  },
  { immediate: true },
)

async function onMenuAction({ type }: { type: string }) {
  const ctx = ui.context
  if (type === 'join') router.push('/join')
  else if (type === 'create') router.push('/create')
  else if (type === 'settings') router.push('/settings')
  else if (type === 'history' && ctx.channelId != null) router.push(`/history/${ctx.channelId}`)
  else if (type === 'edit' && ctx.channelId != null) router.push(`/edit/${ctx.channelId}`)
  else if (type === 'remove' && ctx.channelId != null) {
    const ok = await ui.openConfirm(t('menu.confirmRemove'))
    if (!ok) return
    try {
      await channelsApi.remove(ctx.channelId)
      router.push('/broadcast')
    } catch {}
  } else if (type === 'leave' && ctx.channelId != null) {
    const ok = await ui.openConfirm(t('menu.confirmLeave'))
    if (!ok) return
    try {
      await channelsApi.leave(ctx.channelId)
      router.push('/message')
    } catch {}
  }
}
</script>

<template>
  <!-- Centered phone viewport 240x320 -->
  <div
    class="phone-frame size-qvga shadow-xl bg-black border border-neutral-700"
    role="application"
    aria-label="App viewport 240x320"
  >
    <div class="phone-viewport bg-white relative flex flex-col">
      <header
        v-if="!isAuthPage && !route.path.startsWith('/channel/')"
        class="shrink-0 p-2 text-center text-base text-neutral-100 bg-neutral-700 border-b"
      >
        <template v-if="route.path.startsWith('/settings/language')">
          <div class="text-base font-semibold">{{ t('headers.language') }}</div>
        </template>
        <template v-else-if="route.path.startsWith('/settings/sms')">
          <div class="text-base font-semibold">{{ t('headers.sms') }}</div>
        </template>
        <template v-else-if="route.path.startsWith('/settings/profile')">
          <div class="text-base font-semibold">{{ t('headers.profile') }}</div>
        </template>
        <template v-else-if="route.path.startsWith('/settings')">
          <div class="text-base font-semibold">{{ t('headers.settings') }}</div>
        </template>
        <template v-else>
          <nav class="flex items-center justify-center gap-6 truncate">
            <RouterLink
              to="/broadcast"
              :class="[
                'hover:underline relative pb-1',
                route.path.startsWith('/broadcast') ? 'font-semibold underline' : 'opacity-80',
              ]"
            >
              {{ t('headers.broadcast') }}
              <span
                v-if="route.path.startsWith('/broadcast')"
                class="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-amber-400 rounded"
              />
            </RouterLink>
            <RouterLink
              to="/message"
              :class="[
                'hover:underline relative pb-1',
                route.path.startsWith('/message') ? 'font-semibold underline' : 'opacity-80',
              ]"
            >
              {{ t('headers.message') }}
              <span
                v-if="route.path.startsWith('/message')"
                class="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-amber-400 rounded"
              />
            </RouterLink>
          </nav>
        </template>
      </header>
      <main
        class="flex-1 min-h-0 overflow-hidden text-black relative"
        :style="isAuthPage ? '' : 'padding-bottom: var(--softkey-h)'"
      >
        <RouterView />
        <OptionsMenu @action="onMenuAction" />
        <ConfirmDialog />
        <SoftkeyBar
          :left-label="ui.confirmOpen ? t('common.yes') : (ui.softkeys?.leftLabel ?? undefined)"
          :right-label="ui.confirmOpen ? t('common.no') : (ui.softkeys?.rightLabel ?? undefined)"
          :show-left="
            ui.confirmOpen
              ? true
              : (ui.softkeys?.showLeft ??
                (!isAuthPage && ui.context.page !== 'history' && ui.context.page !== 'join'))
          "
          :show-right="
            ui.confirmOpen ? true : (ui.softkeys?.showRight ?? (!isAuthPage && !isMainPage))
          "
          :flat="isAuthPage"
          @left="ui.softkeys?.onLeft ? ui.softkeys.onLeft() : onLeft()"
          @right="ui.softkeys?.onRight ? ui.softkeys.onRight() : onRight()"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.phone-viewport {
  width: var(--phone-w);
  height: var(--phone-h);
}
</style>
