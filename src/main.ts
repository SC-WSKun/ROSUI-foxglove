import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useRtcClientStore } from './stores/rtcClient'

import App from './App.vue'
import router from './router'

import Global from './plugin/global'
import P2PSocket from './utils/p2psocket'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Global)

const foxgloveClientStore = useFoxgloveClientStore()
const rtcClientStore = useRtcClientStore()

rtcClientStore.initRtcClient().then((p2pSocket: P2PSocket) => {
  foxgloveClientStore.initClient(p2pSocket)
})

app.mount('#app')
