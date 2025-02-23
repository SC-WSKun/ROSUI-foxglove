import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'

import App from './App.vue'
import router from './router'

import Global from './plugin/global'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Global)
app.use(MotionPlugin)

app.mount('#app')
