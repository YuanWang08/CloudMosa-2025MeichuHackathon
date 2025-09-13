import { useAuthStore } from '@/stores/auth'
import type {
  Channel,
  ChannelMessage,
  ChannelWithQuickReplies,
  JoinChannelResponse,
} from '@/types/api'

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = useAuthStore()
  const token = auth.token || localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const url = path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, { ...init, headers })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

// Channels API
export const channelsApi = {
  mine: () => apiFetch<Channel[]>(`/api/channels/mine`),
  joined: () => apiFetch<Channel[]>(`/api/channels/joined`),
  create: (body: { title: string; allowJoin?: boolean; quickReplies?: string[] }) =>
    apiFetch<Channel>(`/api/channels`, { method: 'POST', body: JSON.stringify(body) }),
  join: (code: string) =>
    apiFetch<JoinChannelResponse>(`/api/channels/join`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  leave: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/channels/${id}/leave`, { method: 'DELETE' }),
  details: (id: string) => apiFetch<ChannelWithQuickReplies>(`/api/channels/${id}`),
  update: (id: string, body: { title?: string; allowJoin?: boolean; quickReplies?: string[] }) =>
    apiFetch<{ ok: boolean }>(`/api/channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) => apiFetch<{ ok: boolean }>(`/api/channels/${id}`, { method: 'DELETE' }),
}

// Messages API
export const messagesApi = {
  list: (channelId: string) => apiFetch<ChannelMessage[]>(`/api/channels/${channelId}/messages`),
  send: (channelId: string, content: string) =>
    apiFetch<ChannelMessage>(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  markRead: (channelId: string) =>
    apiFetch<{ ok: boolean }>(`/api/channels/${channelId}/read`, { method: 'POST' }),
}
