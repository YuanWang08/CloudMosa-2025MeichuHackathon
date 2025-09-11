import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n, loadInitialMessages } from './i18n'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(i18n)
await loadInitialMessages()

app.use(createPinia())
app.use(router)

app.mount('#app')
