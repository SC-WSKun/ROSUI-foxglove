<template>
  <div class="top-nav">
    <div class="video-container">
      <LiveVideo ref="liveVideo"/>
      <div class="overlay" @click="openPip">
        打开画中画
      </div>
    </div>
    <slot></slot>
    <JoyStick v-if="showJoyStick" :mode="mode"></JoyStick>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from 'vue';

const props = defineProps<{
  showJoyStick: boolean;
  mode: boolean;
}>();

const liveVideo = ref(null);

const openPip = () => {
  // @ts-ignore
  liveVideo.value?.openPip();
}
</script>

<style lang="less" scoped>
.top-nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  min-height: 150px;

  .video-container {
    position: relative;
    width: 300px;

    &:hover {
      cursor: pointer;
      background: #f0f0f0;
    }

    &:hover .overlay {
      opacity: 1;
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.2); /* 半透明黑色遮罩 */
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0; /* 默认隐藏 */
      transition: opacity 0.3s ease; /* 添加过渡效果 */
    }
  }
}
</style>
