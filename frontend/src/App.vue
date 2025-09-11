<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <h1>This is the home page</h1>

      <nav>
        <RouterLink to="/" class="text-red-500">Home</RouterLink>
        <RouterLink to="/broadcast">broadcast</RouterLink>
        <RouterLink to="/chat">chat</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped></style>
