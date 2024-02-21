import type { GridMap } from '@/typings'
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'
import { message } from 'ant-design-vue'
import arrowImage from '@/assets/arrow.png'

export default class DrawManage {
  panzoomIns: PanzoomObject | null = null
  imgWrap: HTMLElement | null = null
  img: HTMLImageElement | null = null
  arrow: HTMLImageElement | null = null
  addingNav: boolean = false
  navTranslation: {
    x: number
    y: number
    z: number
  } | null = null
  navRotation: {
    x: number
    y: number
    z: number
    w: number
  } | null = null

  drawGridMap(wrap: Element | null, data: GridMap, pz: boolean = false) {
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
    this.img = new Image()
    this.imgWrap = document.createElement('div')
    if (
      wrap?.clientWidth! / wrap?.clientHeight! >
      canvas.width / canvas.height
    ) {
      this.img.height = wrap?.clientHeight!
      this.img.width = (wrap?.clientHeight! * canvas.width) / canvas.height
    } else {
      this.img.width = wrap?.clientWidth!
      this.img.height = (wrap?.clientWidth! * canvas.height) / canvas.width
    }
    this.img.src = canvas.toDataURL('image/png')
    this.img.style.position = 'absolute'
    console.log(this.img.naturalWidth, this.img.naturalHeight)
    this.imgWrap.style.height = `${this.img.height}px`
    this.imgWrap.style.width = `${this.img.width}px`

    this.imgWrap.style.position = 'relative'
    this.imgWrap.appendChild(this.img)
    wrap?.replaceChildren(this.imgWrap)

    // 添加缩放和平移功能
    if (pz) {
      this.setPanzoom(this.imgWrap)
    }
  }

  // 为画布添加缩放和平移拖拽功能
  setPanzoom(imgWrap: HTMLElement) {
    this.panzoomIns = Panzoom(imgWrap, {
      // 限制缩放范围
      minScale: 0.8,
      maxScale: 3,
      cursor: 'normal',
      noBind: true
    })

    // 自定义监听拖拽事件
    this.pzAddListener()
  }

  handleMousedown: any = (event: PointerEvent) => {
    // 鼠标左键
    if (event.button === 0) {
      this.panzoomIns!.handleDown(event)
    }
  }

  handleMousemove: any = (event: PointerEvent) => {
    if (event.buttons === 1 && event.button === 0) {
      this.panzoomIns!.handleMove(event)
    }
  }

  handleMouseup: any = (event: PointerEvent) => {
    if (event.button === 0) {
      this.panzoomIns!.handleUp(event)
    }
  }

  handleMouseleave: any = (event: PointerEvent) => {
    if (event.button === 0) {
      this.panzoomIns!.handleUp(event)
    }
  }

  pzAddListener() {
    this.img?.addEventListener('mousedown', this.handleMousedown)
    this.img?.addEventListener('mousemove', this.handleMousemove)
    this.img?.addEventListener('mouseup', this.handleMouseup)
    this.img?.addEventListener('mouseleave', this.handleMouseleave)
    this.img?.addEventListener('wheel', this.panzoomIns!.zoomWithWheel)
  }

  pzRemoveListener() {
    this.img?.removeEventListener('mousedown', this.handleMousedown)
    this.img?.removeEventListener('mousemove', this.handleMousemove)
    this.img?.removeEventListener('mouseup', this.handleMouseup)
    this.img?.removeEventListener('mouseleave', this.handleMouseleave)
    this.img?.removeEventListener('wheel', this.panzoomIns!.zoomWithWheel)
  }

  navHandleMousedown: any = (event: PointerEvent) => {
    console.log(event.offsetX, event.offsetY)
    event.preventDefault()
    this.addingNav = true
    this.arrow = document.createElement('img') as HTMLImageElement
    this.arrow.src = arrowImage
    if (!this.arrow) return
    this.arrow.className = 'arrow'
    this.arrow.style.position = 'absolute'
    this.arrow.style.pointerEvents = 'none'
    this.arrow.style.width = '10px'
    this.arrow.style.height = '10px'
    this.arrow.style.left = `${event.offsetX - 5}px`
    this.arrow.style.top = `${event.offsetY - 10}px`
    this.arrow.style.transformOrigin = '50% 100%'
    const prevArrow = this.imgWrap?.querySelector('.arrow')
    if (prevArrow) {
      this.imgWrap?.removeChild(prevArrow)
    }
    this.imgWrap?.appendChild(this.arrow)
  }

  navHandleMousemove: any = (event: PointerEvent) => {
    if (this.addingNav && this.arrow) {
      const deltaX = event.offsetX - parseInt(this.arrow.style.left)
      const deltaY = event.offsetY - parseInt(this.arrow.style.top)
      let length = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY))
      length = length > 10 ? length : 10
      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
      this.arrow.style.transform = `rotate(${angle + 90}deg) scaleY(${
        length / 10
      }) scaleX(${length / 30})`
    }
  }

  navHandleMouseup: any = (event: PointerEvent) => {
    this.addingNav = false
  }

  navAddListener() {
    this.pzRemoveListener()
    this.img?.addEventListener('mousedown', this.navHandleMousedown)
    this.img?.addEventListener('mousemove', this.navHandleMousemove)
    this.img?.addEventListener('mouseup', this.navHandleMouseup)
  }

  navRemoveListener() {
    this.img?.removeEventListener('mousedown', this.navHandleMousedown)
    this.img?.removeEventListener('mousemove', this.navHandleMousemove)
    this.img?.removeEventListener('mouseup', this.navHandleMouseup)
  }
}

// let panzoomIns: PanzoomObject | null = null
// let imgWrap: HTMLElement | null = null
// let img: HTMLImageElement | null = null
// let arrow: HTMLImageElement | null = null
// let addingNav: boolean = false
// let navTranslation: {
//   x: number
//   y: number
//   z: number
// } | null = null
// let navRotation: {
//   x: number
//   y: number
//   z: number
//   w: number
// }

// export const drawGridMap = (
//   wrap: Element | null,
//   data: GridMap,
//   pz: boolean = false
// ): { panzoomIns?: PanzoomObject; imgWrap: HTMLElement } => {
//   if (!wrap) {
//     message.error('wrap not exist')
//     throw new Error('wrap not exist')
//   }
//   const canvas = document.createElement('canvas')
//   canvas.id = 'map_canvas'
//   // const resolution = data.info.resolution
//   // const originX = data.info.origin.position.x / resolution
//   // const originY = data.info.origin.position.y / resolution

//   canvas.width = data.info.width
//   canvas.height = data.info.height

//   const ctx = canvas.getContext('2d')!
//   const imgData = ctx.createImageData(canvas.width, canvas.height)
//   for (let row = 0; row < canvas.height; row++) {
//     for (let col = 0; col < canvas.width; col++) {
//       const mapI = col + (canvas.height - 1 - row) * canvas.width
//       const val = data.data[mapI]
//       const i = (col + row * canvas.width) * 4

//       imgData.data[i] = val === 100 ? 0 : val === 0 ? 236 : 127
//       imgData.data[i + 1] = val === 100 ? 0 : val === 0 ? 236 : 127
//       imgData.data[i + 2] = val === 100 ? 0 : val === 0 ? 236 : 127
//       imgData.data[i + 3] = 236
//     }
//   }
//   ctx.putImageData(imgData, 0, 0)
//   img = new Image()
//   imgWrap = document.createElement('div')
//   if (wrap?.clientWidth! / wrap?.clientHeight! > canvas.width / canvas.height) {
//     img.height = wrap?.clientHeight!
//     img.width = (wrap?.clientHeight! * canvas.width) / canvas.height
//   } else {
//     img.width = wrap?.clientWidth!
//     img.height = (wrap?.clientWidth! * canvas.height) / canvas.width
//   }
//   img.src = canvas.toDataURL('image/png')
//   img.style.position = 'absolute'
//   console.log(img.naturalWidth, img.naturalHeight)
//   imgWrap.style.height = `${img.height}px`
//   imgWrap.style.width = `${img.width}px`

//   imgWrap.style.position = 'relative'
//   imgWrap.appendChild(img)
//   wrap?.replaceChildren(imgWrap)

//   // 添加缩放和平移功能
//   if (pz) {
//     return setPanzoom(imgWrap)
//   }

//   return {
//     imgWrap
//   }
// }

// // 为画布添加缩放和平移拖拽功能
// const setPanzoom = (
//   imgWrap: HTMLElement
// ): {
//   imgWrap: HTMLElement
//   panzoomIns: PanzoomObject
// } => {
//   panzoomIns = Panzoom(imgWrap, {
//     // 限制缩放范围
//     minScale: 0.8,
//     maxScale: 3,
//     cursor: 'normal',
//     noBind: true
//   })

//   // 自定义监听拖拽事件
//   pzAddListener()

//   return {
//     imgWrap,
//     panzoomIns
//   }
// }

// const handleMousedown: any = (event: PointerEvent) => {
//   // 鼠标左键
//   if (event.button === 0) {
//     panzoomIns!.handleDown(event)
//   }
// }

// const handleMousemove: any = (event: PointerEvent) => {
//   if (event.buttons === 1 && event.button === 0) {
//     panzoomIns!.handleMove(event)
//   }
// }

// const handleMouseup: any = (event: PointerEvent) => {
//   if (event.button === 0) {
//     panzoomIns!.handleUp(event)
//   }
// }

// const handleMouseleave: any = (event: PointerEvent) => {
//   if (event.button === 0) {
//     panzoomIns!.handleUp(event)
//   }
// }

// export const pzAddListener = () => {
//   img?.addEventListener('mousedown', handleMousedown)
//   img?.addEventListener('mousemove', handleMousemove)
//   img?.addEventListener('mouseup', handleMouseup)
//   img?.addEventListener('mouseleave', handleMouseleave)
//   img?.addEventListener('wheel', panzoomIns!.zoomWithWheel)
// }

// export const pzRemoveListener = () => {
//   img?.removeEventListener('mousedown', handleMousedown)
//   img?.removeEventListener('mousemove', handleMousemove)
//   img?.removeEventListener('mouseup', handleMouseup)
//   img?.removeEventListener('mouseleave', handleMouseleave)
//   img?.removeEventListener('wheel', panzoomIns!.zoomWithWheel)
// }

// const navHandleMousedown: any = (event: PointerEvent) => {
//   console.log(event.offsetX, event.offsetY)
//   event.preventDefault()
//   addingNav = true
//   arrow = document.createElement('img') as HTMLImageElement
//   arrow.src = arrowImage
//   if (!arrow) return
//   arrow.className = 'arrow'
//   arrow.style.position = 'absolute'
//   arrow.style.pointerEvents = 'none'
//   arrow.style.width = '10px'
//   arrow.style.height = '10px'
//   arrow.style.left = `${event.offsetX - 5}px`
//   arrow.style.top = `${event.offsetY - 10}px`
//   arrow.style.transformOrigin = '50% 100%'
//   const prevArrow = imgWrap?.querySelector('.arrow')
//   if (prevArrow) {
//     imgWrap?.removeChild(prevArrow)
//   }
//   imgWrap?.appendChild(arrow)
// }

// const navHandleMousemove: any = (event: PointerEvent) => {
//   if (addingNav && arrow) {
//     const deltaX = event.offsetX - parseInt(arrow.style.left)
//     const deltaY = event.offsetY - parseInt(arrow.style.top)
//     let length = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY))
//     length = length > 10 ? length : 10
//     const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
//     arrow.style.transform = `rotate(${angle + 90}deg) scaleY(${
//       length / 10
//     }) scaleX(${length / 30})`
//   }
// }

// const navHandleMouseup: any = (event: PointerEvent) => {
//   addingNav = false
// }

// export const navAddListener = () => {
//   pzRemoveListener()
//   img?.addEventListener('mousedown', navHandleMousedown)
//   img?.addEventListener('mousemove', navHandleMousemove)
//   img?.addEventListener('mouseup', navHandleMouseup)
// }

// export const navRemoveListener = () => {
//   img?.removeEventListener('mousedown', navHandleMousedown)
//   img?.removeEventListener('mousemove', navHandleMousemove)
//   img?.removeEventListener('mouseup', navHandleMouseup)
// }
