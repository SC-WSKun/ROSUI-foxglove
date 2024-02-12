import type { GridMap } from '@/typings'
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'
import { message } from 'ant-design-vue'

let panzoomIns: PanzoomObject | null = null
let img: HTMLImageElement | null = null

export const drawGridMap = (
  wrap: Element | null,
  data: GridMap,
  pz: boolean = false
): { panzoomIns?: PanzoomObject; img: HTMLImageElement } => {
  if (!wrap) {
    message.error('wrap not exist')
    throw new Error('wrap not exist')
  }
  const canvas = document.createElement('canvas')
  canvas.id = 'map_canvas'
  // const resolution = data.info.resolution
  // const originX = data.info.origin.position.x / resolution
  // const originY = data.info.origin.position.y / resolution

  canvas.width = data.info.width
  canvas.height = data.info.height

  const ctx = canvas.getContext('2d')!
  const imgData = ctx.createImageData(canvas.width, canvas.height)
  for (let row = 0; row < canvas.height; row++) {
    for (let col = 0; col < canvas.width; col++) {
      const mapI = col + (canvas.height - 1 - row) * canvas.width
      const val = data.data[mapI]
      const i = (col + row * canvas.width) * 4

      imgData.data[i] = val === 100 ? 0 : val === 0 ? 236 : 127
      imgData.data[i + 1] = val === 100 ? 0 : val === 0 ? 236 : 127
      imgData.data[i + 2] = val === 100 ? 0 : val === 0 ? 236 : 127
      imgData.data[i + 3] = 236
    }
  }
  ctx.putImageData(imgData, 0, 0)
  img = new Image()
  if (wrap?.clientWidth! / wrap?.clientHeight! > canvas.width / canvas.height) {
    img.height = wrap?.clientHeight!
  } else {
    img.width = wrap?.clientWidth!
  }
  img.src = canvas.toDataURL('image/png')
  wrap?.replaceChildren(img)

  // 添加缩放和平移功能
  if (pz) {
    return setPanzoom(img)
  }

  return {
    img
  }
}

// 为画布添加缩放和平移拖拽功能
const setPanzoom = (
  img: HTMLImageElement
): {
  img: HTMLImageElement
  panzoomIns: PanzoomObject
} => {
  panzoomIns = Panzoom(img, {
    // 限制缩放范围
    minScale: 0.8,
    maxScale: 3,
    cursor: 'normal',
    noBind: true
  })

  // 自定义监听拖拽事件
  pzAddListener()

  return {
    img,
    panzoomIns
  }
}

const handleMousedown: any = (event: PointerEvent) => {
  if (event.button === 0) {
    panzoomIns!.handleDown(event)
  }
}

const handleMousemove: any = (event: PointerEvent) => {
  if (event.buttons === 1 && event.button === 0) {
    panzoomIns!.handleMove(event)
  }
}

const handleMouseup: any = (event: PointerEvent) => {
  if (event.button === 0) {
    panzoomIns!.handleUp(event)
  }
}

const handleMouseleave: any = (event: PointerEvent) => {
  if (event.button === 0) {
    panzoomIns!.handleUp(event)
  }
}

export const pzAddListener = () => {
  img?.addEventListener('mousedown', handleMousedown)
  img?.addEventListener('mousemove', handleMousemove)
  img?.addEventListener('mouseup', handleMouseup)
  img?.addEventListener('mouseleave', handleMouseleave)
  img?.addEventListener('wheel', panzoomIns!.zoomWithWheel)
}

export const pzRemoveListener = () => {
  img?.removeEventListener('mousedown', handleMousedown)
  img?.removeEventListener('mousemove', handleMousemove)
  img?.removeEventListener('mouseup', handleMouseup)
  img?.removeEventListener('mouseleave', handleMouseleave)
  img?.removeEventListener('wheel', panzoomIns!.zoomWithWheel)
}
