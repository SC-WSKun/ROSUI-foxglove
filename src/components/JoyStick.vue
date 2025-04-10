<template>
  <div ref="nippleZone"></div>
</template>

<script setup lang="ts">
import nipplejs from 'nipplejs'
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, defineProps } from 'vue'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { notification } from 'ant-design-vue';

interface State {
  manager: nipplejs.JoystickManager | null
  linearSpeed: number
  angularSpeed: number
  timer: NodeJS.Timeout | undefined
  subId: number | undefined
  channelId: number | undefined
  topicName: MoveTopic | undefined
  stickActive: boolean
}

enum MoveTopic {
  cmd_vel_teleop = '/cmd_vel_teleop',
  cmd_vel = '/cmd_vel',
}

const props = defineProps<{
  // true: cmd_vel_teleop
  // false: cmd_vel
	mode: boolean
}>();

const nippleZone = ref<HTMLDivElement>()

const nippleOptions: nipplejs.JoystickManagerOptions = {
  color: '#5964f8',
  mode: 'static',
  position: {
    bottom: '75px',
    right: '75px'
  },
  size: 150,
  threshold: 0.1
}

const foxgloveClientStore = useFoxgloveClientStore()

const state = reactive<State>({
  manager: null,
  linearSpeed: 0,
  angularSpeed: 0,
  timer: undefined,
  subId: -1,
  channelId: -1,
  topicName: undefined,
  stickActive: false
})

const MAX_LINEAR = 15.0 // m/s
const MAX_ANGULAR = 20.0 // rad/s
const MAX_DISTANCE = 75.0 // pixels

watch(
  () => props.mode,
  () => {
    advertiseMoveTopic(props.mode ? MoveTopic.cmd_vel_teleop : MoveTopic.cmd_vel);
  }
)

/**
 * 处理移动事件
 * 这里后退需要对角速度取反，这样才符合摇杆交互常识
 * @param linearSpeed 线速度
 * @param angularSpeed 角速度
 */
const handleMove = (linearSpeed: number, angularSpeed: number) => {
  foxgloveClientStore.publishMessage(state.channelId!, {
    linear: {
      x: linearSpeed,
      y: 0,
      z: 0
    },
    angular: {
      x: 0,
      y: 0,
      z: linearSpeed > 0 ? angularSpeed : -angularSpeed
    }
  })
}

// 摇杆blur事件
const handleJoystickPause = () => {
  clearInterval(state.timer)
  state.timer = undefined
  handleMove(0, 0)
  state.linearSpeed = 0
  state.angularSpeed = 0
  state.stickActive = false
}

// 键盘监听事件
const handleKeydown = (event: KeyboardEvent) => {
  if (state.stickActive) {
    handleJoystickPause()
  }
  switch (event.key) {
    case 'ArrowUp':
      state.linearSpeed = MAX_LINEAR / MAX_DISTANCE
      break
    case 'ArrowDown':
      state.linearSpeed = -MAX_LINEAR / MAX_DISTANCE
      break
    case 'ArrowLeft':
      state.angularSpeed =
        (MAX_ANGULAR / MAX_DISTANCE) * (state.linearSpeed >= 0 ? 1 : -1)
      break
    case 'ArrowRight':
      state.angularSpeed =
        (-MAX_ANGULAR / MAX_DISTANCE) * (state.linearSpeed >= 0 ? 1 : -1)
      break
    default:
      break
  }
  handleMove(state.linearSpeed, state.angularSpeed)
}

// 键盘松开事件
const handleKeyup = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
      state.linearSpeed = 0
      break
    case 'ArrowLeft':
    case 'ArrowRight':
      state.angularSpeed = 0
      break
    default:
      break
  }
  handleMove(state.linearSpeed, state.angularSpeed)
}
// 解耦摇杆控制相关话题
const advertiseMoveTopic = (topic: MoveTopic) => {
  if (state.topicName === topic) return;
  state.topicName = topic;
  state.channelId = foxgloveClientStore.advertiseTopic({
    encoding: 'cdr',
    schema:
      '# This expresses velocity in free space broken into its linear and angular parts.\n\nVector3  linear\nVector3  angular\n\n================================================================================\nMSG: geometry_msgs/Vector3\n# This represents a vector in free space.\n\n# This is semantically different than a point.\n# A vector is always anchored at the origin.\n# When a transform is applied to a vector, only the rotational component is applied.\n\nfloat64 x\nfloat64 y\nfloat64 z\n',
    schemaEncoding: 'ros2msg',
    schemaName: 'geometry_msgs/msg/Twist',
    topic,
  });
}

onMounted(() => {
  // 发布小车控制相关话题
  advertiseMoveTopic(MoveTopic.cmd_vel);
  nextTick(() => {
    nippleOptions.zone = nippleZone.value
    state.manager = nipplejs.create(nippleOptions)

    // 摇杆控制
    state.manager.on('start', () => {
      state.stickActive = true
      state.timer = setInterval(
        () => handleMove(state.linearSpeed, state.angularSpeed),
        25
      )
    })
    state.manager.on('end', handleJoystickPause)
    state.manager.on('move', (event, nipple) => {
      state.linearSpeed =
        (Math.sin(nipple.angle.radian) * MAX_LINEAR) / MAX_DISTANCE
      state.angularSpeed =
        (-Math.cos(nipple.angle.radian) * MAX_ANGULAR) / MAX_DISTANCE
    })

    // 键盘控制
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keyup', handleKeyup)

    notification.success({
      placement: 'topRight',
      message: '请通过【右下角摇杆】 或 键盘的【上下左右键】进行操控小车',
      duration: 3
    })
  })
})

onBeforeUnmount(() => {
  foxgloveClientStore.unAdvertiseTopic(state.channelId!)
  clearInterval(state.timer)
  state.timer = undefined
  if (state.manager) {
    state.manager.off('start', () => {})
    state.manager.off('end', () => {})
    state.manager.off('move', () => {})
    state.manager.destroy()
    state.manager = null
  }
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('keyup', handleKeyup)
})
</script>

<style lang="less" scoped></style>
