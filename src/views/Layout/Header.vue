<template>
  <div class="Header">
    <div class="Header-logo" @click="onClickLogo">
      <img src="/robot.png" />
      RosUI-Foxglove
    </div>
    <div class="Header-info">
      <a-dropdown v-if="menus.length">
        <a class="ant-dropdown-link" @click.prevent>
          操作
          <DownOutlined :style="{ fontSize: '12px' }" />
        </a>
        <template #overlay>
          <a-empty
            v-if="!menus.length"
            :image="emptyImage"
            description="no data"
            :image-style="{
              margin: '30px 40px',
              marginBottom: '10px'
            }"
          ></a-empty>
          <a-menu @click="handleMenuClick" v-else>
            <a-menu-item v-for="item in menus" :key="item.key">
              <span>{{ item.text }}</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LogoutOutlined,
  DownOutlined,
  RobotOutlined
} from '@ant-design/icons-vue'
import { Empty, message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useRtcClientStore } from '@/stores/rtcClient'
import type P2PSocket from '@/utils/p2psocket'

const router = useRouter()
const emptyImage = Empty.PRESENTED_IMAGE_SIMPLE
const globalStore = useGlobalStore()
const foxgloveClientStore = useFoxgloveClientStore()
const rtcClientStore = useRtcClientStore()

let connectTimer: number | null = null

const menus: any[] = [
  {
    key: 'connect',
    text: '连接机器人'
  },
  {
    key: 'disconnect',
    text: '断开连接'
  }
]

// 处理菜单点击事件
const handleMenuClick = ({ key }: { key: string }) => {
  switch (key) {
    case 'connect':
      handleConnect()
      break
    case 'disconnect':
      handleDisconnect()
      break
    default:
      break
  }
}

// 处理连接操作
const handleConnect = () => {
  if (globalStore.state.connected) {
    message.warning('已经连接机器人，无需重复连接')
    return
  }
  globalStore.state.modalRef.openModal({
    title: '连接机器人',
    type: 'form',
    width: 600,
    formOptions: {
      items: [
        {
          label: '机器人ID',
          key: 'id',
          type: 'input',
          placeholder: '请输入机器人ID',
          required: true,
          defaultValue: () => 'robot_01'
        }
      ]
    },
    doneMsg: '连接成功',
    callback: async (record: any) => {
      return new Promise(async (resolve, reject) => {
        globalStore.setLoading(true, '连接中')
        const start = new Date().getTime()
        connectTimer = setInterval(() => {
          const end = new Date().getTime()
          if (end - start > 1000 * 30) {
            clearInterval(connectTimer as number)
            connectTimer = null
            globalStore.setLoading(false)
            rtcClientStore.closeRtcClient()
            reject('连接超时，请确认ID是否正确')
          }
        })
        const socket: P2PSocket = await rtcClientStore.initRtcClient(record.id)
        clearInterval(connectTimer as number)
        connectTimer = null
        foxgloveClientStore.initClient(socket)
        globalStore.setLoading(false)
        globalStore.setConnected(true)
        resolve('连接成功')
      })
    }
  })
}

// 处理断开连接操作
const handleDisconnect = () => {
  if (!globalStore.state.connected) {
    message.warning('未连接机器人，无需断开连接')
    return
  }
  foxgloveClientStore.closeClient()
  rtcClientStore.closeRtcClient()
  globalStore.setConnected(false)
}

const onClickLogo = () => {
  router.push('/')
}
</script>

<style lang="less">
.Header {
  width: 100vw;
  height: @header-height;
  min-width: 800px;
  // background-color: @theme-color1;
  background: linear-gradient(180deg, @gradient-color1, @gradient-color2);
  .flex(space-between);
  padding: 0 30px;

  &-logo {
    height: 100%;
    color: #000;
    font-size: @font-size-large;
    font-weight: bold;
    .flex;
    cursor: pointer;

    img {
      height: 100%;
    }
  }

  &-info {
    .flex();

    .logout {
      color: @white-font-color;
    }
  }
}

.ant-dropdown-link {
  color: @white-font-color;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 6px;
  transition: all 0.3s;
  margin-right: 20px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
