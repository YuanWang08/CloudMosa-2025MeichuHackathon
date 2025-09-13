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

function onLeft() {
  if (ui.confirmOpen) {
    ui.chooseConfirm(true)
    return
  }
  // 歷史頁隱藏 Menu：按 LSK 無反應
  if (ui.context.page === 'history') return
  if (isAuthPage.value) return
  // 開啟 Options Menu
  ui.openMenu()
}
async function onRight() {
  if (ui.confirmOpen) {
    ui.chooseConfirm(false)
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
  // 確認框優先：Z=Yes、X=No
  if (ui.confirmOpen) {
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault()
      ui.chooseConfirm(true)
      return
    }
    if (e.key === 'x' || e.key === 'X') {
      e.preventDefault()
      ui.chooseConfirm(false)
      return
    }
  }

  // Z/X 全域 LSK/RSK 映射（避免在確認框/選單/認證頁觸發）
  if (!ui.menuOpen && !ui.confirmOpen && !isAuthPage.value) {
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault()
      onLeft()
      return
    }
    if (e.key === 'x' || e.key === 'X') {
      e.preventDefault()
      onRight()
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
  if (e.key === 'Backspace' || e.key === 'Escape') {
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
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

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
    else if (route.path.startsWith('/join')) ui.setContext({ page: 'join' })
    else if (route.path.startsWith('/settings/language')) ui.setContext({ page: 'language' })
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
        v-if="!isAuthPage"
        class="shrink-0 p-2 text-center text-xs text-neutral-100 bg-neutral-800 border-b"
      >
        <template v-if="route.path.startsWith('/settings/language')">
          <div class="font-semibold">{{ t('headers.language') }}</div>
        </template>
        <template v-else-if="route.path.startsWith('/settings/sms')">
          <div class="font-semibold">{{ t('headers.sms') }}</div>
        </template>
        <template v-else-if="route.path.startsWith('/settings/profile')">
          <div class="font-semibold">{{ t('headers.profile') }}</div>
        </template>
        <template v-else-if="route.path.startsWith('/settings')">
          <div class="font-semibold">{{ t('headers.settings') }}</div>
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
      <main class="flex-1 min-h-0 overflow-hidden text-black relative">
        <RouterView />
        <OptionsMenu @action="onMenuAction" />
        <ConfirmDialog />
        <SoftkeyBar
          :left-label="ui.confirmOpen ? t('common.yes') : undefined"
          :right-label="ui.confirmOpen ? t('common.no') : undefined"
          :show-left="(!isAuthPage && ui.context.page !== 'history') || ui.confirmOpen"
          :show-right="(!isAuthPage && !isMainPage) || ui.confirmOpen"
          @left="onLeft"
          @right="onRight"
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
