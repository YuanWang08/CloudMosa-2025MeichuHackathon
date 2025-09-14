import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserProfile {
  id: string
  username: string
  avatarInitials: string
  avatarColor: string
  avatarImage?: string | null
  favoriteEmojis?: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<UserProfile | null>(
    localStorage.getItem('user')
      ? (JSON.parse(localStorage.getItem('user') as string) as UserProfile)
      : null,
  )
  const isAuthed = computed(() => !!token.value)

  function setAuth(t: string, u: UserProfile) {
    token.value = t
    user.value = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function clear() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function me() {
    if (!token.value) return null
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token.value}` } })
    if (!res.ok) {
      clear()
      return null
    }
    const data = (await res.json()) as UserProfile
    user.value = data
    localStorage.setItem('user', JSON.stringify(data))
    return data
  }

  function setFavorites(favs: string[]) {
    if (!user.value) return
    user.value = { ...user.value, favoriteEmojis: favs }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  return { token, user, isAuthed, setAuth, clear, me, setFavorites }
})
