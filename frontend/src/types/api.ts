export interface Channel {
  id: string
  title: string
  code: string
  allowJoin: boolean
  ownerId: string
  createdAt: string
  updatedAt: string
  // 來自 joined API 的擴充欄位
  unreadCount?: number
  // joined/details API 可選帶回擁有者資訊
  owner?: OwnerUser
}

export interface ChannelQuickReply {
  id: string
  channelId: string
  index: number
  text: string
}

export interface ChannelWithQuickReplies extends Channel {
  ChannelQuickReplies?: ChannelQuickReply[]
}

export interface ChannelMessage {
  id: string
  channelId: string
  authorId: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface JoinChannelResponse {
  ok: boolean
  channelId: string
}

export interface OwnerUser {
  id: string
  username: string
  avatarImage?: string | null
  avatarInitials: string
  avatarColor: string
}
