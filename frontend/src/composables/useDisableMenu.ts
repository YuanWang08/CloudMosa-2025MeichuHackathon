import { onBeforeUnmount, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui'

/**
 * Hide the left softkey and suppress LSK/Escape behaviour.
 * Intended for settings sub-pages where the Options Menu should stay hidden.
 */
export function useDisableMenu() {
  const ui = useUiStore()

  onMounted(() => {
    ui.closeMenu()
    ui.setSoftkeys({
      showLeft: false,
      onLeft: () => {},
    })
  })

  onBeforeUnmount(() => {
    ui.setSoftkeys(null)
  })
}

