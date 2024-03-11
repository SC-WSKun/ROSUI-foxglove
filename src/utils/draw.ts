import type { GridMap, MapInfo, Quaternion } from '@/typings'
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'
import { message, notification } from 'ant-design-vue'
import arrowImage from '@/assets/arrow.png'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'

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
  mapInfo: MapInfo | null = null
  scale: number = 1 // 地图缩放比例
  foxgloveClientStore: any = null
  goalChannelId: number | undefined = undefined
  goalSeq: number = 0 // 导航点发布序号

  constructor() {
    this.foxgloveClientStore = useFoxgloveClientStore()
  }

  // 将后端返回的map通过canvas进行转化并展示成img
  drawGridMap(wrap: Element | null, data: GridMap, pz: boolean = false) {
    if (!wrap) {
      message.error('wrap not exist')
      throw new Error('wrap not exist')
    }
    const canvas = document.createElement('canvas')
    canvas.id = 'map_canvas'
    this.mapInfo = data.info
    console.log('draw.ts - mapInfo', this.mapInfo)

    canvas.width = this.mapInfo.width
    canvas.height = this.mapInfo.height

    // canvas绘制地图
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
    // img标签展示地图
    this.img = new Image()
    // 确保地图能够等比例完全展示
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
    // 地图缩放比例
    this.scale = this.mapInfo.width / this.img.width

    // imgWrap包含map和arrow
    if (!this.imgWrap) {
      this.imgWrap = document.createElement('div')
      this.imgWrap.style.position = 'relative'
      wrap.appendChild(this.imgWrap)
    }
    this.img.style.position = 'absolute'
    this.img.id = 'map_img'
    this.imgWrap.style.height = `${this.img.height}px`
    this.imgWrap.style.width = `${this.img.width}px`

    const lastImg = document.querySelector('#map_img')
    if (lastImg) {
      this.imgWrap.replaceChild(this.img, lastImg)
    } else {
      this.imgWrap.appendChild(this.img)
    }

    // 添加缩放和平移功能
    if (pz) {
      this.setPanzoom(this.imgWrap)
    }

    // 启动导航点交互
    if (this.goalChannelId !== undefined) {
      // 优先移除地图交互监听，避免冲突
      this.pzRemoveListener()
      this.navAddListener()
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

  // 拖拽&缩放地图的鼠标事件监听
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

  // 添加地图交互事件监听
  pzAddListener() {
    this.img?.addEventListener('mousedown', this.handleMousedown)
    this.img?.addEventListener('mousemove', this.handleMousemove)
    this.img?.addEventListener('mouseup', this.handleMouseup)
    this.img?.addEventListener('mouseleave', this.handleMouseleave)
    this.img?.addEventListener('wheel', this.panzoomIns!.zoomWithWheel)
  }

  // 移除地图交互事件监听
  pzRemoveListener() {
    this.img?.removeEventListener('mousedown', this.handleMousedown)
    this.img?.removeEventListener('mousemove', this.handleMousemove)
    this.img?.removeEventListener('mouseup', this.handleMouseup)
    this.img?.removeEventListener('mouseleave', this.handleMouseleave)
    this.img?.removeEventListener('wheel', this.panzoomIns!.zoomWithWheel)
  }

  // 添加导航箭头的鼠标事件监听
  navHandleMousedown: any = (event: PointerEvent) => {
    event.preventDefault()
    this.addingNav = true
    this.arrow = document.createElement('img') as HTMLImageElement
    this.arrow.src = arrowImage
    if (!this.arrow) return
    this.arrow.className = 'arrow'
    this.arrow.style.position = 'absolute'
    this.arrow.style.pointerEvents = 'none'
    this.arrow.style.width = '1px'
    this.arrow.style.height = '1px'
    this.arrow.style.left = `${event.offsetX}px`
    this.arrow.style.top = `${event.offsetY}px`
    this.arrow.style.transformOrigin = '50% 100%'
    this.arrow.style.transform = 'translate(-50%, -100%)'
    console.log(213, event.offsetX * this.scale, event.offsetY * this.scale)
    if (!this.mapInfo) {
      message.error('map_info not found!')
      return
    }
    // 像素坐标 -> 栅格坐标 -> 真实世界坐标
    const { x, y } = pixelToWorldCoordinate(
      event.offsetX,
      event.offsetY,
      this.scale,
      this.mapInfo.resolution,
      this.mapInfo.origin.position.x,
      this.mapInfo.origin.position.y
    )
    this.navTranslation = {
      x,
      y,
      z: 0
    }
    console.log('navTranslation', this.navTranslation)

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
      length = length > 1 ? length : 1
      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
      this.arrow.style.transform = `translate(-50%, -100%) rotate(${
        angle + 90
      }deg) scaleY(${length / 1}) scaleX(${length / 4})`
    }
  }

  navHandleMouseup: any = (event: PointerEvent) => {
    this.addingNav = false
    if (!this.mapInfo) {
      message.error('map_info is not found')
      return
    }
    // 计算鼠标松开位置的真实世界坐标，同像素坐标 -> 栅格坐标 -> 真实世界坐标
    const { x, y } = pixelToWorldCoordinate(
      event.offsetX,
      event.offsetY,
      this.scale,
      this.mapInfo.resolution,
      this.mapInfo.origin.position.x,
      this.mapInfo.origin.position.y
    )
    if (!this.navTranslation) {
      console.log('navTranslation is not found')
      return
    }
    this.navRotation = coordinatesToQuaternion(
      this.navTranslation.x,
      this.navTranslation.y,
      x,
      y
    )
    // 处于导航模式
    if (this.goalChannelId !== undefined) {
      this.foxgloveClientStore.publishMessage(this.goalChannelId, {
        header: {
          seq: this.goalSeq++,
          stamp: {
            secs: Math.floor(Date.now() / 1000),
            nsecs: (Date.now() / 1000) * 1000000
          },
          frame_id: 'map'
        },
        pose: {
          position: this.navTranslation,
          orientation: this.navRotation
        }
      })
    }
    console.log('rotation', this.navRotation)
  }

  // 添加导航点交互监听
  navAddListener() {
    this.pzRemoveListener()
    this.img?.addEventListener('mousedown', this.navHandleMousedown)
    this.img?.addEventListener('mousemove', this.navHandleMousemove)
    this.img?.addEventListener('mouseup', this.navHandleMouseup)
  }

  // 移除导航点交互监听
  navRemoveListener() {
    this.img?.removeEventListener('mousedown', this.navHandleMousedown)
    this.img?.removeEventListener('mousemove', this.navHandleMousemove)
    this.img?.removeEventListener('mouseup', this.navHandleMouseup)
  }

  // 启动导航
  launchNavigation() {
    this.goalChannelId = this.foxgloveClientStore.advertiseTopic({
      encoding: 'cdr',
      schema:
        '# A Pose with reference coordinate frame and timestamp\n\nstd_msgs/Header header\nPose pose\n\n================================================================================\nMSG: geometry_msgs/Pose\n# A representation of pose in free space, composed of position and orientation.\n\nPoint position\nQuaternion orientation\n\n================================================================================\nMSG: geometry_msgs/Point\n# This contains the position of a point in free space\nfloat64 x\nfloat64 y\nfloat64 z\n\n================================================================================\nMSG: geometry_msgs/Quaternion\n# This represents an orientation in free space in quaternion form.\n\nfloat64 x 0\nfloat64 y 0\nfloat64 z 0\nfloat64 w 1\n\n================================================================================\nMSG: std_msgs/Header\n# Standard metadata for higher-level stamped data types.\n# This is generally used to communicate timestamped data\n# in a particular coordinate frame.\n\n# Two-integer timestamp that is expressed as seconds and nanoseconds.\nbuiltin_interfaces/Time stamp\n\n# Transform frame with which this data is associated.\nstring frame_id\n\n================================================================================\nMSG: builtin_interfaces/Time\n# This message communicates ROS Time defined here:\n# https://design.ros2.org/articles/clock_and_time.html\n\n# The seconds component, valid over all int32 values.\nint32 sec\n\n# The nanoseconds component, valid in the range [0, 1e9).\nuint32 nanosec\n',
      schemaEncoding: 'ros2msg',
      schemaName: 'geometry_msgs/msg/PoseStamped',
      topic: '/goal_pose'
    })
    message.success('导航模式已启动')
    this.foxgloveClientStore.publishMessage(this.goalChannelId, {
      header: {
        seq: this.goalSeq++,
        stamp: {
          secs: Math.floor(Date.now() / 1000),
          nsecs: (Date.now() / 1000) * 1000000
        },
        frame_id: 'map'
      },
      pose: {
        position: this.navTranslation,
        orientation: this.navRotation
      }
    })
  }

  // 关闭导航
  closeNavigation() {
    this.navRemoveListener()
    this.goalChannelId = undefined
    this.foxgloveClientStore.unAdvertiseTopic(this.goalChannelId)
    message.warning('导航模式已关闭')
  }
}

// 像素坐标转真实世界坐标
const pixelToWorldCoordinate = (
  pixelOffsetX: number,
  pixelOffsetY: number,
  scale: number,
  resolution: number,
  originX: number,
  originY: number
): { x: number; y: number } => {
  return {
    x: pixelOffsetX * scale * resolution + originX,
    y: -(pixelOffsetY * scale * resolution + originY)
  }
}

// 起始坐标计算旋转四元数（二维平面）
const coordinatesToQuaternion = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Quaternion => {
  // 计算向量
  const dx = endX - startX
  const dy = endY - startY
  // 计算旋转角度（弧度）
  const angle = Math.atan2(dy, dx)
  console.log((angle / Math.PI) * 180)

  // 计算四元数
  const w = Math.cos(angle / 2)
  const z = Math.sin(angle / 2)
  return {
    w,
    x: 0,
    y: 0,
    z
  }
}
