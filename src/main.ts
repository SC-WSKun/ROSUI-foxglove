import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'

import App from './App.vue'
import router from './router'

import Global from './plugin/global'
import { FoxgloveClient } from '@foxglove/ws-protocol'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Global)

const foxgloveClientStore = useFoxgloveClientStore()
const socket = new WebSocket('ws://localhost:8765', [
  FoxgloveClient.SUPPORTED_SUBPROTOCOL
])
foxgloveClientStore.initClient(socket)

app.mount('#app')
