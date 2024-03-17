<template>
  <div class="Modal">
    <a-modal
      v-model:open="modalState.open"
      :title="modalState.title"
      :okText="modalState.confirmText || '确定'"
      :cancelText="'取消'"
      @ok="modalState.confirmCb"
      destroyOnClose
      :width="modalState.width"
      :footer="modalState.showFooter ? undefined : null"
    >
      <Form
        v-if="modalState.type === 'form'"
        :formOptions="modalState.formOptions"
        :dataSource="modalState.dataSource"
        ref="formRef"
      ></Form>
      <Table
        v-else-if="modalState.type === 'table'"
        :tableOptions="modalState.tableOptions"
        :dataSource="modalState.dataSource"
        :loading="false"
      ></Table>
      <component
        v-else-if="modalState.type === 'custom'"
        :is="customComponent"
        :dataSource="modalState.dataSource"
        :props="propsData"
        :confirmHook="modalState.confirmCb"
        ref="customRef"
      ></component>
      <div
        v-else-if="modalState.type === 'normal'"
        v-html="modalState.content"
      ></div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { ModalOptions, FormOptions } from '@/typings/component'
import _ from 'lodash'
import { message } from 'ant-design-vue'

interface ModalState extends ModalOptions {
  open: boolean
  confirmCb: () => any
}

const modalState: ModalState = reactive({
  open: false,
  title: 'Modal Title',
  type: 'normal',
  formOptions: undefined,
  confirmCb: () => {},
  dataSource: undefined,
  confirmText: undefined,
  doneMsg: undefined,
  component: undefined,
  width: undefined,
  showFooter: true,
  showMessage: true,
  content: undefined,
  // closeModal: undefined
})

let propsData: any = undefined

const formRef: any = ref(null)
const customRef: any = ref(null)
let customComponent: any = null

const openModal = (modalOptions: ModalOptions) => {
  const {
    title,
    type,
    callback,
    formOptions,
    tableOptions,
    dataSource,
    confirmText,
    doneMsg,
    props,
    component,
    width,
    showFooter,
    showMessage,
    content,
    // closeModal
  } = modalOptions
  modalState.title = title
  modalState.type = type || 'normal'
  modalState.formOptions = formOptions
  modalState.tableOptions = tableOptions
  modalState.dataSource = dataSource
  modalState.confirmText = confirmText
  modalState.width = width || 520
  modalState.showFooter = showFooter === undefined ? true : showFooter
  modalState.showMessage = showMessage === undefined ? true : showMessage
  modalState.content = content
  // modalState.closeModal = closeModal === undefined ? true : closeModal
  customComponent = component
  propsData = props
  
  
  modalState.confirmCb = async () => {
    try {
      if (modalState.type == 'form') {
        await formRef.value.validate()
      } else if (modalState.type === 'custom' && customRef?.value?.validate) {
        await customRef.value.validate()
      }
    } catch (err) {
      console.error(err);
      return
    }
    try {
      if (callback)
        await callback(formRef?.value?.formFields || customRef?.value?.data)
      if (modalState.showMessage) message.success(doneMsg || '操作成功')
      // if(modalState.closeModal) modalState.open = false
    } catch (err) {
      console.error(err);
      return
    }
  }
  modalState.open = true
}

const closeModal = () => {
  modalState.open = false
}

defineExpose({
  openModal,
  closeModal
})
</script>

<style lang="less"></style>
