<template>
  <div class="build">
    <div class="view" id="buildMap">
      <div class="tips" v-if="!state.finish && !state.building">
        暂未建图，点击右侧开始建图
      </div>
    </div>
    <div class="config">
      <a-card
        title="操作栏"
        :bordered="false"
        style="width: 100%; height: 100%"
      >
        <div class="build">
          <!-- 建图前 -->
          <div class="btn" v-if="state.curState === 0">
            <a-button
              @click="launchBuild"
              type="primary"
              :icon="h(CaretRightOutlined)"
            >
              开始建图
            </a-button>
          </div>
          <!-- 建图中 -->
          <div class="btn" v-if="state.curState === 1">
            <a-button
              @click="switchBuild"
              type="primary"
              :icon="h(PauseOutlined)"
              danger
            >
              暂停建图
            </a-button>
            <div class="switch">
              <a-switch
                v-model:checked="state.navigating"
                @change="switchNavigation"
              ></a-switch
              >导航模式
            </div>
          </div>
          <!-- 建图后 -->
          <div class="btn" v-if="state.curState === 2">
            <a-button
              @click="switchBuild"
              type="primary"
              :icon="h(CaretRightOutlined)"
            >
              继续建图
            </a-button>
            <a-button @click="saveMap" type="primary" :icon="h(SaveOutlined)">
              保存地图
            </a-button>
          </div>
          <JoyStick v-if="state.building && !state.pause"></JoyStick>
        </div>
      </a-card>
    </div>
    <Modal ref="modalRef" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, h, onBeforeUnmount } from 'vue'
import {
  CaretRightOutlined,
  PauseOutlined,
  SaveOutlined,
  CheckOutlined
} from '@ant-design/icons-vue'
import { message, notification } from 'ant-design-vue'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useGlobalStore } from '@/stores/global'
import type { MessageData } from '@foxglove/ws-protocol'
import type { GridMap } from '@/typings'
import DrawManage from '@/utils/draw'
import _ from 'lodash'

interface State {
  building: boolean
  mapSubId: number
  pause: boolean
  finish: boolean
  drawManage: DrawManage
  onceLaunchNavigation: (() => void) | null
  curState: number
  navigating: boolean
}

const foxgloveClientStore = useFoxgloveClientStore()
const globalStore = useGlobalStore()

const modalRef: any = ref(null)

const STATE_MAP = {
  WAITING: 0,
  BUILDING: 1,
  PAUSING: 2
}

const state = reactive<State>({
  building: false,
  mapSubId: -1,
  pause: false,
  finish: false,
  drawManage: new DrawManage(),
  onceLaunchNavigation: null,
  curState: 0,
  navigating: false
})

// 地图消息监听回调
const mapMsgHandler = ({
  op,
  subscriptionId,
  timestamp,
  data
}: MessageData) => {
  if (state.mapSubId === subscriptionId) {
    const parseData = foxgloveClientStore.readMsgWithSubId(
      state.mapSubId,
      data
    ) as GridMap
    const wrap = document.querySelector('#buildMap')
    state.drawManage.drawGridMap(wrap, parseData, true)
    if (state.onceLaunchNavigation) {
      state.onceLaunchNavigation()
      console.log(444)
    }
  }
}

// 订阅地图消息
const subscribeMapTopic = () => {
  foxgloveClientStore
    .subscribeTopic('/map')
    .then((res) => {
      state.mapSubId = res
      state.building = true
      state.pause = false
      state.finish = false
      foxgloveClientStore.listenMessage(mapMsgHandler)
    })
    .catch((err: string) => {
      message.error(err)
    })
}

// 取消订阅地图消息
const unSubscribeMapTopic = () => {
  foxgloveClientStore.stopListenMessage(mapMsgHandler)
  foxgloveClientStore.unSubscribeTopic(state.mapSubId)
}

// 启动建图模式
const launchBuild = () => {
  if (!state.building) {
    modalRef.value.openModal({
      title: '开始建图',
      type: 'form',
      width: 800,
      confirmText: '启动',
      showCancel: true,
      showMessage: false,
      formOptions: {
        items: [
          {
            label: '地图类型',
            key: 'map_type',
            type: 'select',
            dictIndex: 'map_type',
            required: true,
            placeholder: '请选择地图类型'
          }
        ]
      },
      callback: (data: { map_type: number }) => {
        globalStore.setLoading(true, '请稍等')
        // 切换建图模式
        foxgloveClientStore
          .callService('/tiered_nav_state_machine/switch_mode', {
            mode: 1,
            map_type: data.map_type
          })
          ?.then((res) => {
            globalStore.setLoading(false)
            state.curState = STATE_MAP.BUILDING
            subscribeMapTopic()
            state.onceLaunchNavigation = _.once(() => {
              state.drawManage.pzAddListener()
              state.drawManage.advertiseNavTopic()
            })
            state.drawManage.subscribeCarPosition()
            state.drawManage.subscribeScanPoints()
          })
          .catch((err) => {
            globalStore.setLoading(false)
            console.log(err)
            message.error('Call service failed')
          })
      }
    })
  } else {
    foxgloveClientStore.unSubscribeTopic(state.mapSubId)
    state.building = false
    state.finish = true
    state.mapSubId = -1
  }
}

// 建图暂停/继续
const switchBuild = () => {
  if (state.pause) {
    state.pause = false
    state.curState = STATE_MAP.BUILDING
    foxgloveClientStore.listenMessage(mapMsgHandler)
    message.success('建图继续')
  } else {
    state.pause = true
    state.curState = STATE_MAP.PAUSING
    foxgloveClientStore.stopListenMessage(mapMsgHandler)
    state.navigating = false
    switchNavigation()
    message.warn('建图暂停')
  }
}

// 开/关导航模式
const switchNavigation = () => {
  if (state.navigating) {
    state.drawManage.pzRemoveListener()
    state.drawManage.navAddListener()
    notification.success({
      placement: 'topRight',
      message: '请在地图上选择导航点',
      duration: 3
    })
  } else {
    state.drawManage.navRemoveListener()
    state.drawManage.pzAddListener()
  }
}

// 终止建图模式
// const finishBuild = () => {
//   state.finish = true
//   state.building = false
//   state.pause = false
//   unSubscribeMapTopic()
//   state.drawManage.unSubscribeCarPosition()
//   state.drawManage.navRemoveListener()
//   message.success('建图完成')
// }

// 保存地图
const saveMap = () => {
  console.log('save', globalStore.state.modalRef)
  modalRef.value.openModal({
    title: '保存地图',
    type: 'form',
    width: 800,
    confirmText: '保存',
    showCancel: true,
    formOptions: {
      items: [
        {
          label: '地图名称',
          key: 'name',
          type: 'input',
          required: true,
          placeholder: '请输入地图名称',
          allowClear: true
        }
      ]
    },
    callback: (data: { name: string }) => {
      console.log(data)
      foxgloveClientStore
        .callService('/tiered_nav_state_machine/save_map', {
          name: data.name
        })
        .then((res: any) => {
          console.log('save_res', res)
          foxgloveClientStore.callService(
            '/tiered_nav_state_machine/switch_mode',
            {
              mode: 0
            }
          )
        })
        .catch((err) => {
          console.log(err)
          message.error('保存地图失败')
        })
    }
  })
}

onBeforeUnmount(() => {
  unSubscribeMapTopic()
  state.drawManage.unSubscribeCarPosition()
  state.drawManage.unSubscribeScanPoints()
  state.drawManage.navRemoveListener()
})
</script>

<style lang="less" scoped>
.build {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 15px;

  .view {
    flex-grow: 1;
    background: #fff;
    border: 10px solid #fff;
    .flex;

    .tips {
      font-size: 0.8em;
      color: #999;
      letter-spacing: 1px;
    }
  }

  .config {
    width: 25%;
    height: 100%;
    background: #fff;
    overflow: auto;

    .build {
      margin-top: 20px;
      .flex(space-between, center, column);

      .btn {
        width: 80%;
        .flex(center, center);
        gap: 10px;
        .switch {
          display: flex;
          gap: 5px;
        }
      }
    }
  }
}
</style>
