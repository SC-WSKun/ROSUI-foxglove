import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'

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
        },
        {
          path: 'virtualWall',
          name: 'virtualWall',
          component: () => import('../views/VirtualWall.vue')
        },
        {
          path: 'mapManagement',
          name: 'mapManagement',
          component: () => import('../views/MapManagement.vue')
        }
      ]
    },

    {
      path: '/',
      redirect: '/dashboard/build'
    }
  ]
})

export default router
