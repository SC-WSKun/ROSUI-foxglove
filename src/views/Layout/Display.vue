<template>
  <div class="Display">
    <RouterView></RouterView>
    <div class="video-container" v-if="showVideo">
      <LiveVideo ref="liveVideo"/>
      <div class="overlay" @click="openPip">
        打开画中画
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterView, useRouter } from 'vue-router';

const router = useRouter();
const liveVideo = ref(null);

const showVideo = computed(() => {
  // @ts-ignore
  return ['build', 'navigation'].includes(router.currentRoute.value.name);
});

const openPip = () => {
  // @ts-ignore
  liveVideo.value?.openPip();
} 
</script>

<style lang="less">
.Display {
  position: relative;
  flex: 1;
  height: calc(100vh - @header-height);
  overflow-y: auto;
  background: @main-background-color;
  padding: 15px 15px 10px 15px;
}

.video-container {
  position: absolute;
  cursor: pointer;
  width: 300px;
  top: 15px;
  left: 15px;

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
</style>
