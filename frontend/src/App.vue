<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <!-- Centered phone viewport 240x320 -->
  <div
    class="phone-frame size-qvga shadow-xl bg-black border border-neutral-700"
    role="application"
    aria-label="App viewport 240x320"
  >
    <div class="phone-viewport bg-white flex flex-col">
      <header class="shrink-0 p-2 text-center text-xs text-neutral-600 bg-neutral-100 border-b">
        <nav class="flex items-center justify-center gap-3 truncate">
          <RouterLink to="/" class="hover:underline">Home</RouterLink>
          <RouterLink to="/broadcast" class="hover:underline">Broadcast</RouterLink>
          <RouterLink to="/chat" class="hover:underline">Chat</RouterLink>
        </nav>
      </header>
      <main class="flex-1 min-h-0 overflow-hidden text-black">
        <RouterView />
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
