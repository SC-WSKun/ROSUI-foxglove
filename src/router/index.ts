import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import { useGlobalStore } from '@/stores/global'

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
      name: 'index',
      component: () => import('../views/Index.vue'),
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.name === 'index') next();
  else {
    const globalStore = useGlobalStore();
    if (globalStore.robotID !== '') next();
    else next({ name: 'index' });
  }
});

export default router
