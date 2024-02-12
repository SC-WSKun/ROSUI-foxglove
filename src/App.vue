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
import { nextTick, onMounted, ref, type Ref } from 'vue'
import type ModalVue from './base/Modal.vue';

const globalStore = useGlobalStore()

const modalRef: any = ref(null)
console.log(modalRef);


onMounted(() => {
  console.log(modalRef.value)
  globalStore.setModalRef(modalRef.value)
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
