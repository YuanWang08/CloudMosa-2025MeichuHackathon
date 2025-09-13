import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PageContext =
  | 'home'
  | 'broadcast'
  | 'message'
  | 'channel'
  | 'create'
  | 'join'
  | 'history'
  | 'edit'
  | 'settings'
  | 'language'
  | 'signin'
  | 'signup'

export interface UiContext {
  page: PageContext
  channelId?: string
  isOwner?: boolean
}

export const useUiStore = defineStore('ui', () => {
  const menuOpen = ref(false)
  const context = ref<UiContext>({ page: 'home' })
  const confirmOpen = ref(false)
  const confirmMessage = ref('')
  const confirmSelectedYes = ref(true)
  let confirmResolve: ((v: boolean) => void) | null = null

  // 可由頁面覆蓋的軟鍵設定（例如在頻道輸入頁把 RSK 改為 Send）
  type Softkeys = {
    leftLabel?: string
    rightLabel?: string
    showLeft?: boolean
    showRight?: boolean
    onLeft?: (() => void) | null
    onRight?: (() => void) | null
  } | null
  const softkeys = ref<Softkeys>(null)

  function setContext(ctx: UiContext) {
    context.value = ctx
  }
  function openMenu() {
    menuOpen.value = true
  }
  function closeMenu() {
    menuOpen.value = false
  }

  async function openConfirm(message: string, defaultYes = true): Promise<boolean> {
    confirmMessage.value = message
    confirmSelectedYes.value = defaultYes
    confirmOpen.value = true
    return new Promise<boolean>((resolve) => {
      confirmResolve = resolve
    })
  }
  function chooseConfirm(yes: boolean) {
    if (confirmResolve) confirmResolve(yes)
    confirmResolve = null
    confirmOpen.value = false
  }
  function toggleConfirmSelection() {
    confirmSelectedYes.value = !confirmSelectedYes.value
  }

  function setSoftkeys(sk: Softkeys) {
    softkeys.value = sk
  }

  return {
    menuOpen,
    context,
    setContext,
    openMenu,
    closeMenu,
    // confirm
    confirmOpen,
    confirmMessage,
    confirmSelectedYes,
    openConfirm,
    chooseConfirm,
    toggleConfirmSelection,
    // softkeys
    softkeys,
    setSoftkeys,
  }
})
