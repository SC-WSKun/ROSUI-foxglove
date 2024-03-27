import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { ModalOptions } from '@/typings/component'

type GlobalState = {
  loading: boolean
  loadingTip: string
  modalRef: any
  connected: boolean
}

export const useGlobalStore = defineStore('global', () => {
  const state = reactive<GlobalState>({
    loading: false,
    loadingTip: '加载中...',
    modalRef: null,
    connected: false
  })

  function setLoading(loading: boolean, loadingTip?: string) {
    state.loadingTip = loadingTip || '加载中...'
    state.loading = loading
  }

  function setModalRef(modalRef: any) {
    state.modalRef = modalRef
  }

  function setConected(connected: boolean) {
    state.connected = connected
  }

  function isConnected() {
    return state.connected
  }

  function openModal(modalOptions: ModalOptions) {
    state.modalRef.openModal(modalOptions)
  }

  function closeModal() {
    state.modalRef.closeModal()
  }

  return {
    state,
    setLoading,
    setModalRef,
    setConected,
    isConnected,
    openModal,
    closeModal
  }
})
