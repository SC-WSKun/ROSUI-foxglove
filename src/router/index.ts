import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import { useFoxgloveClientStore } from '../stores/foxgloveClient'

// const rosStore = useRosStore()

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      children: [
        {
          path: 'build',
          name: 'build',
          component: () => import('../views/Build.vue')
        },
        {
          path: 'navigation',
          name: 'navigation',
          component: () => import('../views/Navigation.vue')
        }
      ]
    },

    {
      path: '/',
      redirect: '/dashboard/build'
    }
  ]
})

// router.beforeEach((to, from, next) => {
//   // 路由拦截
//   if (to.path === '/login') {
//     if (rosStore.rosConnected) return
//     next()
//   } else {
//     if (!rosStore.rosConnected) {
//       next('/login')
//     }
//     next()
//   }
// })

export default router
