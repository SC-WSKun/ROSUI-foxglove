import type { PanzoomObject } from '@panzoom/panzoom'

export * as Config from './config'
export * as Component from './component'

// export interface UserInfo {
//     email: string
//     id: string
//     is_active: boolean
//     is_superuser: boolean
//     is_verified: boolean
//     name: string
// }

export interface Point {
  x: number
  y: number
  z: number
  intensity: number
  ring: number
  time: number
}

export interface Map {
  map_name: string
  map_type: number
  nav_mode: number
}

export interface GridMap {
  data: Uint8Array
  header: {
    frame_id: string
    stamp: {
      nesc: number
      sec: number
    }
  }
  info: {
    width: number
    height: number
    resolution: number
    origin: {
      position: {
        x: number
        y: number
        z: number
      }
      orientation: {
        w: number
        x: number
        y: number
        z: number
      }
    }
    map_load_time: {
      nsec: number
      sec: number
    }
  }
}