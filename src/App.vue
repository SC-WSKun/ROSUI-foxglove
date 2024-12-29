<template>
  <a-config-provider
    :theme="{
      token: {
        colorPrimary: '#5b63d3'
      }
    }"
    :locale="zhCN"
  >
    <a-spin
      :spinning="globalStore.state.loading"
      :tip="globalStore.state.loadingTip"
    >
    </a-spin>
    <Modal ref="modalRef" />
    <RouterView />
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { RouterView } from 'vue-router'
import { useGlobalStore } from './stores/global'
import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { useRtcClientStore } from './stores/rtcClient'


const globalStore = useGlobalStore()
const rtcClientStore = useRtcClientStore()

const modalRef: any = ref(null)
let timer: number | null = null

onMounted(() => {
  timer = setInterval(() => {
    if (modalRef.value) {
      globalStore.setModalRef(modalRef.value)
      clearInterval(timer!)
      timer = null
    }
  }, 10)
})

onBeforeUnmount(() => {
  rtcClientStore.closeRtcClient()
})
</script>

<style lang="less">
html,
body,
div {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  user-select: none;
  color: @black-font-color;
}
</style>
