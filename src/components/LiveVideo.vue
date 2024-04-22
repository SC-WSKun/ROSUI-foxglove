<template>
  <div>
    <video id="video"></video>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRtcClientStore } from '../stores/rtcClient'
import { useGlobalStore } from '../stores/global'

const rtcClientStore = useRtcClientStore()
const globalStore = useGlobalStore()

watch(
  () => globalStore.state.connected,
  (newVal: boolean) => {
    if (newVal) {
      launchVideo()
    } else {
      closeVideo()
    }
  }
)

// 初始化实时画面
onMounted(() => {
  if (globalStore.isConnected()) {
    launchVideo()
  }
})

// 启动实时画面
const launchVideo = () => {
  const video: HTMLVideoElement | null = document.querySelector('#video')
  console.log('launch video', video);
  if (video && !video.srcObject) {
    video.srcObject = rtcClientStore.getStream()
    video.autoplay = true
  }
}

// 关闭实时画面
const closeVideo = () => {
  const video: HTMLVideoElement | null = document.querySelector('#video')
  if (video) {
    video.srcObject = null
    video.autoplay = false
  }
}
</script>

<style lang="less" scoped>
#video {
  width: 100%;
  height: 100%;
}
</style>
