<template>
  <div class="build">
    <div class="view" id="buildMap">
      <div
        class="tips"
        v-if="state.curState === 0 || !globalStore.isConnected()"
      >
        暂未建图，点击右侧开始建图
      </div>
    </div>
    <div class="config">
      <a-card
        title="实时画面"
        :bordered="false"
        style="width: 100%; height: 100%"
      >
        <LiveVideo />
      </a-card>
      <a-card
        title="操作栏"
        :bordered="false"
        style="width: 100%; height: 100%"
      >
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
          <a-button
            @click="closeBuild"
            type="primary"
            :icon="h(StopOutlined)"
            danger
            >结束建图</a-button
          >
        </div>
        <JoyStick v-if="state.curState === 1"></JoyStick>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, h, onBeforeUnmount, watch } from 'vue'
import {
  CaretRightOutlined,
  PauseOutlined,
  SaveOutlined,
  StopOutlined
} from '@ant-design/icons-vue'
import { message, notification } from 'ant-design-vue'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useGlobalStore } from '@/stores/global'
import type { MessageData } from '@foxglove/ws-protocol'
import type { GridMap, serviceResponse } from '@/typings'
import DrawManage from '@/utils/draw'
import _ from 'lodash'
import { useRtcClientStore } from '@/stores/rtcClient'

interface State {
  mapSubId: number
  drawManage: DrawManage
  onceLaunchNavigation: (() => void) | null
  curState: number
  navigating: boolean
}

const foxgloveClientStore = useFoxgloveClientStore()
const globalStore = useGlobalStore()
const rtcClientStore = useRtcClientStore()

const STATE_MAP = {
  WAITING: 0,
  BUILDING: 1,
  PAUSING: 2
}

const state = reactive<State>({
  mapSubId: -1,
  drawManage: new DrawManage(),
  onceLaunchNavigation: null,
  curState: 0,
  navigating: false
})

watch(
  () => globalStore.state.connected,
  (newVal: boolean) => {
    // 异常中断兜底逻辑
    if (!newVal) {
      state.curState = STATE_MAP.WAITING
      unSubscribeMapTopic()
      state.drawManage?.unSubscribeCarPosition()
      state.drawManage?.unSubscribeScanPoints()
      state.drawManage?.navRemoveListener()
      state.drawManage?.clear()
    }
  }
)

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
    }
  }
}

// 订阅地图消息
const subscribeMapTopic = () => {
  foxgloveClientStore
    .subscribeTopic('/map')
    .then((res) => {
      state.mapSubId = res
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
  state.mapSubId = -1
}

// 启动建图模式
const launchBuild = () => {
  globalStore.openModal({
    title: '开始建图',
    type: 'form',
    width: 800,
    confirmText: '启动',
    showCancel: true,
    showMsg: false,
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
          message.error('切换建图模式失败，请稍后再试')
        })
    }
  })
}

// 建图暂停/继续
const switchBuild = () => {
  if (state.curState === STATE_MAP.PAUSING) {
    state.curState = STATE_MAP.BUILDING
    foxgloveClientStore.listenMessage(mapMsgHandler)
    message.success('建图继续')
  } else if (state.curState === STATE_MAP.BUILDING) {
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

// 保存地图
const saveMap = () => {
  globalStore.openModal({
    title: '保存地图',
    type: 'form',
    width: 800,
    confirmText: '保存',
    showCancel: true,
    showMsg: false,
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
    callback: async (data: { name: string }) => {
      console.log(data)
      const res: serviceResponse = await foxgloveClientStore.callService(
        '/tiered_nav_conn_graph/query_map',
        {
          map_name: data.name
        }
      )
      if (res.result) {
        message.error('地图名称已存在')
        throw new Error('地图名称已存在')
      }
      globalStore.setLoading(true, '地图保存中')
      // 保存地图
      foxgloveClientStore
        .callService('/tiered_nav_state_machine/save_map', {
          name: data.name
        })
        .then((res: any) => {
          if (!res.result) {
            throw new Error('保存地图失败')
          }
          console.log('save_res', res)
          globalStore.setLoading(false)
          message.success('保存地图成功')
        })
        .catch((err) => {
          console.log(err)
          message.error('保存地图失败')
          globalStore.setLoading(false)
        })
    }
  })
}

// 结束建图
const closeBuild = () => {
  globalStore.openModal({
    title: '结束建图',
    type: 'normal',
    content: '是否结束当前建图？',
    showMsg: false,
    callback: () => {
      globalStore.setLoading(true, '请稍等')
      foxgloveClientStore
        .callService('/tiered_nav_state_machine/switch_mode', {
          mode: 0
        })
        .then(() => {
          unSubscribeMapTopic()
          state.drawManage.unSubscribeCarPosition()
          state.drawManage.unSubscribeScanPoints()
          state.drawManage.navRemoveListener()
          state.curState = STATE_MAP.WAITING
          state.drawManage.clear()
          globalStore.setLoading(false)
          message.warning('建图已结束')
        })
    }
  })
}

onBeforeUnmount(() => {
  foxgloveClientStore.callService('/tiered_nav_state_machine/switch_mode', {
    mode: 0
  })
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
    width: 35%;
    height: 100%;
    overflow: auto;
    .flex(center, center, column);
    gap: 15px;

    .btn {
      width: 100%;
      .flex(center, center);
      gap: 10px;
      .switch {
        .flex;
        gap: 5px;
      }
    }
    // }
  }
}
</style>
