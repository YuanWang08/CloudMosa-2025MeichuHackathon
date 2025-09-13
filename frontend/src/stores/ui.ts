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
  }
})
