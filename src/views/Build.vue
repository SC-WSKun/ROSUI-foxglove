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
          <div class="btn">
            <a-button
              @click="launchBuild"
              type="primary"
              :icon="h(CaretRightOutlined)"
              v-if="!state.finish && !state.building"
            >
              开始建图
            </a-button>
            <a-button
              @click="switchBuild"
              type="primary"
              :icon="h(PauseOutlined)"
              v-if="state.building && !state.pause"
              danger
            >
              暂停建图
            </a-button>
            <a-button
              @click="switchBuild"
              type="primary"
              :icon="h(CaretRightOutlined)"
              v-if="state.pause"
            >
              继续建图
            </a-button>
            <a-button
              @click="finishBuild"
              type="primary"
              :icon="h(CheckOutlined)"
              v-if="state.pause"
            >
              完成建图
            </a-button>
            <a-button
              @click="saveMap"
              type="primary"
              v-if="state.finish"
              :icon="h(SaveOutlined)"
            >
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
import { reactive, ref, h } from 'vue'
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
import { drawGridMap } from '@/utils/draw'

interface State {
  building: boolean
  mapSubId: number
  pause: boolean
  finish: boolean
}

const foxgloveClientStore = useFoxgloveClientStore()
const globalStore = useGlobalStore()

const modalRef: any = ref(null)

const state = reactive<State>({
  building: false,
  mapSubId: -1,
  pause: false,
  finish: false
})

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
    drawGridMap(wrap, parseData)
  }
}

const subscribeMapTopic = () => {
  foxgloveClientStore
    .subscribeTopic('/map')
    .then((res) => {
      state.mapSubId = res
      state.building = true
      state.pause = false
      state.finish = false
      notification.success({
        placement: 'topRight',
        message: '请通过【右下角摇杆】 或 键盘的【上下左右键】进行操控小车',
        duration: 3
      })
      foxgloveClientStore.listenMessage(mapMsgHandler)
    })
    .catch((err: string) => {
      message.error(err)
    })
}

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
            console.log('res', res)
            subscribeMapTopic()
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

const switchBuild = () => {
  if (state.pause) {
    state.pause = false
    foxgloveClientStore.listenMessage(mapMsgHandler)
    message.success('建图继续')
  } else {
    state.pause = true
    foxgloveClientStore.stopListenMessage(mapMsgHandler)
    message.warn('建图暂停')
  }
}

const finishBuild = () => {
  state.finish = true
  state.building = false
  state.pause = false
  foxgloveClientStore.stopListenMessage(mapMsgHandler)
  foxgloveClientStore.unSubscribeTopic(state.mapSubId)
  message.success('建图完成')
}

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

    .build {
      margin-top: 20px;
      .flex(space-between, center, column);

      .btn {
        width: 80%;
        .flex(center, center);
        gap: 10px;
      }
    }
  }
}
</style>
