<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { channelsApi } from '@/lib/api'
import type { Channel } from '@/types/api'

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const mine = ref<Channel[]>([])
const joined = ref<Channel[]>([])

const hasAny = computed(() => mine.value.length > 0 || joined.value.length > 0)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [m, j] = await Promise.all([channelsApi.mine(), channelsApi.joined()])
    mine.value = m
    joined.value = j
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

function openChannel(id: string) {
  router.push({ name: 'channel', params: { id } })
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-gradient-to-b from-slate-700 to-neutral-900 text-white">
    <header class="p-2 text-center text-sm font-semibold bg-black/20">Home</header>
    <div class="flex-1 p-3 text-sm flex flex-col gap-2 overflow-auto">
      <div class="grid grid-cols-2 gap-2 mb-2">
        <button class="bg-emerald-400 text-black rounded py-1" @click="$router.push('/create')">
          Create
        </button>
        <button class="bg-amber-300 text-black rounded py-1" @click="$router.push('/join')">
          Join
        </button>
      </div>

      <div v-if="loading" class="opacity-80">Loading…</div>
      <div v-else-if="error" class="text-red-300">{{ error }}</div>
      <div v-else>
        <template v-if="hasAny">
          <div v-if="mine.length" class="space-y-1">
            <div class="text-xs opacity-80">My channels</div>
            <ul class="space-y-2">
              <li
                v-for="c in mine"
                :key="c.id"
                class="bg-white/10 rounded p-2 flex items-center justify-between"
              >
                <div class="truncate">{{ c.title }}</div>
                <button
                  class="bg-white text-black rounded px-2 py-1 text-xs"
                  @click="openChannel(c.id)"
                >
                  Open
                </button>
              </li>
            </ul>
          </div>
          <div v-if="joined.length" class="space-y-1 mt-3">
            <div class="text-xs opacity-80">Joined</div>
            <ul class="space-y-2">
              <li
                v-for="c in joined"
                :key="c.id"
                class="bg-white/10 rounded p-2 flex items-center justify-between"
              >
                <div class="truncate">{{ c.title }}</div>
                <button
                  class="bg-white text-black rounded px-2 py-1 text-xs"
                  @click="openChannel(c.id)"
                >
                  Open
                </button>
              </li>
            </ul>
          </div>
        </template>
        <div v-else class="opacity-80">
          No channels yet. Create your first one or join with a 6-digit code.
        </div>
      </div>
    </div>
  </div>
</template>
