import { reactive } from 'vue'
import { defineStore } from 'pinia'

type GlobalState = {
  loading: boolean
  loadingTip: string
  modalRef: any
}

export const useGlobalStore = defineStore('global', () => {
  const state = reactive<GlobalState>({
    loading: false,
    loadingTip: '加载中...',
    modalRef: null
  })

  function setLoading(loading: boolean, loadingTip?: string) {
    state.loadingTip = loadingTip || '加载中...'
    state.loading = loading
  }

  function setModalRef(modalRef: any) {
    state.modalRef = modalRef
  }

  return { state, setLoading, setModalRef }
})
