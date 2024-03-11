import type { Config } from '@/typings'

export default [
  {
    label: '建图',
    key: 'build',
    path: '/dashboard/build'
  },
  {
    label: '导航',
    key: 'navigation',
    path: '/dashboard/navigation'
  },
  // {
  //   label: '巡逻',
  //   key: 'patrol',
  //   path: '/dashboard/patrol'
  // },
  // {
  //   label: '状态',
  //   key: 'status',
  //   path: '/dashboard/status'
  // },
  // {
  //   label: '校正',
  //   key: 'calibrate',
  //   path: '/dashboard/calibrate'
  // },
  // {
  //   label: '设置',
  //   key: 'setting',
  //   path: '/dashboard/setting'
  // }
] as Config.MenuConfig[]
