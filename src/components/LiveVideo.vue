<template>
  <div>
    <video id="video"></video>
    <a-button @click="openPip" :disabled="pipBtnDisabled" type="primary">开启画中画</a-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRtcClientStore } from '../stores/rtcClient'
import { useGlobalStore } from '../stores/global'
import { message } from "ant-design-vue";

const rtcClientStore = useRtcClientStore()
const globalStore = useGlobalStore()
const pipBtnDisabled = ref(true);

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

const openPip = async () => {
  const picVideo = document.querySelector('#video')!;
  try {
    // @ts-ignore
    picVideo.requestPictureInPicture().then(() => {
      console.log('进入画中画模式');
    });
  } catch (error) {
    message.error('当前浏览器不支持画中画功能');
    console.error(error);
  }
}

onMounted(() => {
  const video: HTMLVideoElement | null = document.querySelector('#video');
  if (!video) return;
  video.addEventListener('loadedmetadata', () => {
    pipBtnDisabled.value = false;
  });
})
</script>

<style lang="less" scoped>
#video {
  width: 100%;
  height: 100%;
}
</style>
