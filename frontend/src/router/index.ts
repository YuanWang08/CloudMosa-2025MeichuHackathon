import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/signin', name: 'signin', component: () => import('../views/SignInView.vue') },
    { path: '/signup', name: 'signup', component: () => import('../views/SignUpView.vue') },
    {
      path: '/broadcast',
      name: 'broadcast',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/BroadcastView.vue'),
    },
    { path: '/message', name: 'message', component: () => import('../views/ChatView.vue') },
    { path: '/create', name: 'create', component: () => import('../views/CreateChannelView.vue') },
    { path: '/join', name: 'join', component: () => import('../views/JoinChannelView.vue') },
    { path: '/channel/:id', name: 'channel', component: () => import('../views/ChannelView.vue') },
    { path: '/history/:id', name: 'history', component: () => import('../views/HistoryView.vue') },
    { path: '/edit/:id', name: 'edit', component: () => import('../views/EditChannelView.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
    {
      path: '/settings/language',
      name: 'settings-language',
      component: () => import('../views/SettingsLanguageView.vue'),
    },
    {
      path: '/settings/emoji',
      name: 'settings-emoji',
      component: () => import('../views/SettingsFavoriteEmojiView.vue'),
    },
    {
      path: '/settings/emoji/picker',
      name: 'settings-emoji-picker',
      component: () => import('../views/SettingsEmojiPickerView.vue'),
    },
    {
      path: '/settings/profile',
      name: 'settings-profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/settings/sms',
      name: 'settings-sms',
      component: () => import('../views/SettingsSmsView.vue'),
    },
  ],
})

export default router

// 路由守衛
router.beforeEach((to) => {
  const auth = useAuthStore()
  const authed = !!localStorage.getItem('token') || auth.isAuthed
  const isAuthRoute = to.path.startsWith('/signin') || to.path.startsWith('/signup')
  if (!authed && !isAuthRoute) {
    if (to.path !== '/signin') return { path: '/signin' }
  }
  if (authed && isAuthRoute) {
    return { path: '/broadcast' }
  }
})
