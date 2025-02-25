import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'
import { disableDirective } from './directives/disable'

import App from './App.vue'
import router from './router'

import Global from './plugin/global'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Global)
app.use(MotionPlugin)

app.directive('disable', disableDirective);

app.mount('#app')
