import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { ModalOptions } from '@/typings/component'
import type { Transform } from '@/typings'
import dict from '@/dict'
import _ from 'lodash'

type GlobalState = {
  loading: boolean
  loadingTip: string
  modalRef: any
  connected: boolean
  /**   Transform Tree
   *                             map
   *                              |
   *                             odom
   *                              |
   *                        base_footprint
   *                              |
   *                           base_link
   *                              |
   *    ———————————————————————————————————————————————————————
   *    |           |             |             |             |
   * imu_link   laser_link    left_wheel    right_wheel   base_scan
   */
  odomToMap: Transform | null
  baseFootprintToOdom: Transform | null
  baseLinkToBaseFootprint: Transform | null
  baseScanToBaseLink: Transform | null
  imuLinkToBaseLink: Transform | null
  laserLinkToBaseLink: Transform | null
  leftWheelToBaseLink: Transform | null
  rightWheelToBaseLink: Transform | null
}

export const useGlobalStore = defineStore('global', () => {
  const state = reactive<GlobalState>({
    loading: false,
    loadingTip: '加载中...',
    modalRef: null,
    connected: false,
    odomToMap: null,
    baseFootprintToOdom: null,
    baseLinkToBaseFootprint: null,
    baseScanToBaseLink: null,
    imuLinkToBaseLink: null,
    laserLinkToBaseLink: null,
    leftWheelToBaseLink: null,
    rightWheelToBaseLink: null
  })

  function setLoading(loading: boolean, loadingTip?: string) {
    state.loadingTip = loadingTip || '加载中...'
    state.loading = loading
  }

  function setModalRef(modalRef: any) {
    state.modalRef = modalRef
  }

  function setConnected(connected: boolean) {
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

  function updateTransform(
    transforms: {
      transform: Transform
      child_frame_id: string
      [key: string]: any
    }[]
  ) {
    transforms.forEach((transform) => {
      const { transform_map } = dict
      _.set(
        state,
        _.get(transform_map, transform.child_frame_id),
        transform.transform
      )
    })
  }

  function getTransform(transformKey: string) {
    return _.get(state, transformKey)
  }

  return {
    state,
    setLoading,
    setModalRef,
    setConnected,
    isConnected,
    openModal,
    closeModal,
    updateTransform,
    getTransform
  }
})
