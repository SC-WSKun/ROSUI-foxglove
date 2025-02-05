<template>
  <div class="Header">
    <div class="Header-logo" @click="onClickLogo">
      <img src="/robot-logo.png" />
      ROS 2 HMI
    </div>
    <div class="Header-btns">
      <span @click="handleWifiConnext">Wifi配网</span>
      <span @click="handleDisconnect">断开连接</span>
      【{{ globalStore.robotID }}】
    </div>
  </div>
</template>

<script setup lang="ts">
import { Empty, message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useRtcClientStore } from '@/stores/rtcClient'
import Wifi from '@/components/Wifi.vue';

const router = useRouter()
const emptyImage = Empty.PRESENTED_IMAGE_SIMPLE
const globalStore = useGlobalStore()
const foxgloveClientStore = useFoxgloveClientStore()
const rtcClientStore = useRtcClientStore()

let connectTimer: NodeJS.Timeout | null = null

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

const handleWifiConnext = () => {
  globalStore.openModal({
    title: "配网",
    type: "custom",
    component: Wifi,
    showFooter: false,
  });
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
  background-color: #5b63d3;
  .flex(space-between);
  padding: 0 30px;

  &-logo {
    height: 75%;
    color: #000;
    font-size: @font-size-large;
    font-weight: bold;
    .flex;
    cursor: pointer;

    img {
      height: 100%;
      margin-right: 10px;
    }
  }

  &-btns {
    span {
      cursor: pointer;
      padding: 8px 15px;
      border-radius: 5px;
      &:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
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
