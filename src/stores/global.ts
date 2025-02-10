import { reactive } from "vue";
import { useRouter } from 'vue-router';
import { defineStore } from "pinia";
import type { ModalOptions } from "@/typings/component";
import type { Transform } from "@/typings";
import dict from "@/dict";
import _ from "lodash";

type GlobalState = {
  loading: boolean;
  loadingTip: string;
  modalRef: any;
  connected: boolean;
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
  odomToMap: Transform | null;
  baseFootprintToOdom: Transform | null;
  baseLinkToBaseFootprint: Transform | null;
  baseScanToBaseLink: Transform | null;
  imuLinkToBaseLink: Transform | null;
  laserLinkToBaseLink: Transform | null;
  leftWheelToBaseLink: Transform | null;
  rightWheelToBaseLink: Transform | null;
  showLabelInput: boolean;
};

// export const useGlobalStore = defineStore("global", () => {
//   const state = reactive<GlobalState>({
//     loading: false,
//     loadingTip: "加载中...",
//     modalRef: null,
//     connected: false,
//     odomToMap: null,
//     baseFootprintToOdom: null,
//     baseLinkToBaseFootprint: null,
//     baseScanToBaseLink: null,
//     imuLinkToBaseLink: null,
//     laserLinkToBaseLink: null,
//     leftWheelToBaseLink: null,
//     rightWheelToBaseLink: null,
//     showLabelInput: false,
//   });

//   function setLoading(loading: boolean, loadingTip?: string) {
//     state.loadingTip = loadingTip || "加载中...";
//     state.loading = loading;
//   }

//   function setModalRef(modalRef: any) {
//     state.modalRef = modalRef;
//   }

//   function setConnected(connected: boolean) {
//     state.connected = connected;
//   }

//   function isConnected() {
//     return state.connected;
//   }

//   function openModal(modalOptions: ModalOptions) {
//     state.modalRef.openModal(modalOptions);
//   }

//   function closeModal() {
//     state.modalRef.closeModal();
//   }

//   function updateTransform(
//     transforms: {
//       transform: Transform;
//       child_frame_id: string;
//       [key: string]: any;
//     }[],
//   ) {
//     transforms.forEach((transform) => {
//       const { transform_map } = dict;
//       _.set(
//         state,
//         _.get(transform_map, transform.child_frame_id),
//         transform.transform,
//       );
//     });
//   }

//   function getTransform(transformKey: string) {
//     return _.get(state, transformKey);
//   }

//   function switchLabelInput() {
//     state.showLabelInput = !state.showLabelInput;
//   }

//   function closeLabelInput() {
//     state.showLabelInput = false;
//   }

//   return {
//     state,
//     setLoading,
//     setModalRef,
//     setConnected,
//     isConnected,
//     openModal,
//     closeModal,
//     updateTransform,
//     getTransform,
//     switchLabelInput,
//     closeLabelInput,
//   };
// });
class GlobalStore {
  state: GlobalState;
  robotID: string = 'robot_04';
  constructor(){
    this.state = reactive<GlobalState>({
      loading: false,
      loadingTip: "加载中...",
      modalRef: null,
      connected: false,
      odomToMap: null,
      baseFootprintToOdom: null,
      baseLinkToBaseFootprint: null,
      baseScanToBaseLink: null,
      imuLinkToBaseLink: null,
      laserLinkToBaseLink: null,
      leftWheelToBaseLink: null,
      rightWheelToBaseLink: null,
      showLabelInput: false,
    })
  }
  setLoading(loading: boolean, loadingTip?: string) {
    this.state.loadingTip = loadingTip || "加载中...";
    this.state.loading = loading;
  }

  setModalRef(modalRef: any) {
    this.state.modalRef = modalRef;
  }

  setConnected(connected: boolean) {
    this.state.connected = connected;
  }

  setRobotID(robotID: string) {
    this.robotID = robotID;
  }

  isConnected() {
    return this.state.connected;
  }

  openModal(modalOptions: ModalOptions) {
    this.state.modalRef.openModal(modalOptions);
  }

  closeModal() {
    this.state.modalRef.closeModal();
  }

  updateTransform(
    transforms: {
      transform: Transform;
      child_frame_id: string;
      [key: string]: any;
    }[],
  ) {
    transforms.forEach((transform) => {
      const { transform_map } = dict;
      _.set(
        this.state,
        _.get(transform_map, transform.child_frame_id),
        transform.transform,
      );
    });
  }

  getTransform(transformKey: string) {
    return _.get(this.state, transformKey);
  }

  switchLabelInput() {
    this.state.showLabelInput = !this.state.showLabelInput;
  }

  closeLabelInput() {
    this.state.showLabelInput = false;
  }
}

let instance: GlobalStore | null = null;
export const useGlobalStore = () => {
  if (!instance) instance = new GlobalStore();
  return instance;
}