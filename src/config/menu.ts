import type { Config } from '@/typings'

export default [
  {
    label: '创建地图',
    key: 'build',
    path: '/dashboard/build'
  },
  {
    label: '自主导航',
    key: 'navigation',
    path: '/dashboard/navigation'
  },
  {
    label: '虚拟墙管理',
    key: 'virtualWall',
    path: '/dashboard/virtualWall'
  },
  {
    label: '地图管理',
    key: 'mapManagement',
    path: '/dashboard/mapManagement'
  }
] as Config.MenuConfig[]
