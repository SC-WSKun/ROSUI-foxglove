<template>
  <div class="navigation">
    <div class="view" id="navigationMap">
      <div class="tips" v-if="!state.selectedMap">请先在右侧选择地图</div>
    </div>
    <div class="config">
      <a-card
        title="操作栏"
        :bordered="false"
        style="width: 100%; height: 100%"
      >
        <!-- 选择地图 -->
        <div class="select" v-if="state.curState === 0">
          <div class="list">
            <Table
              :tableOptions="tableOptions"
              :dataSource="state.maps"
              :loading="false"
            ></Table>
          </div>
        </div>
        <!-- 预览 -->
        <div class="btn" v-if="state.curState === 1">
          <a-button @click="initPose">指定初始位姿</a-button>
        </div>
        <!-- 指定初始位姿 -->
        <div class="btn" v-if="state.curState === 2">
          <a-button type="primary" v-if="state.adding" @click="finishAdding">
            完成
          </a-button>
        </div>
        <!-- 导航 -->
        <div class="btn" v-if="state.curState === 3">
          <JoyStick></JoyStick>
          <a-button @click="connectMap">连接地图</a-button>
          <div class="switch">
            <a-switch
              v-model:checked="state.navigating"
              @change="switchNavigation"
            ></a-switch
            >导航模式
          </div>

          <a-button @click="closeNav" type="primary" danger>结束导航</a-button>
        </div>
        <!-- 暂停导航 -->
        <div class="btn" v-if="state.curState === 4">
          <a-button @click="subscribeMapTopic">恢复导航</a-button>
          <a-button @click="selectMap">重新选择地图</a-button>
        </div>
      </a-card>
    </div>
    <Modal ref="modalRef" />
  </div>
</template>

<script setup lang="ts">
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useGlobalStore } from '@/stores/global'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { type GridMap, type Map } from '@/typings'
import type { TableOptions } from '@/typings/component'
import type { MessageData } from '@foxglove/ws-protocol'
import DrawManage from '@/utils/draw'
import { type PanzoomObject } from '@panzoom/panzoom'
import { message, notification } from 'ant-design-vue'

interface State {
  maps: Map[]
  selectedMap: Map | null
  panzoomIns: PanzoomObject | null
  imgWrap: HTMLElement | null
  adding: boolean
  mapSubId: number
  drawManage: DrawManage
  initFinish: boolean
  goalChannelId: number | undefined
  connecting: boolean
  curState: number
  navigating: boolean
}

const foxgloveClientStore = useFoxgloveClientStore()
const globalStore = useGlobalStore()

const state = reactive<State>({
  maps: [],
  selectedMap: null,
  panzoomIns: null,
  imgWrap: null,
  adding: false,
  mapSubId: -1,
  drawManage: new DrawManage(),
  initFinish: false,
  goalChannelId: undefined,
  connecting: false,
  curState: 0,
  navigating: false
})

const modalRef: any = ref(null)

const STATE_MAP = {
  SELECTING: 0, // 选择地图
  PREVIEWING: 1, // 预览地图
  INITING: 2, // 初始化位姿
  NAVIGATING: 3, // 导航
  PAUSING: 4 // 暂停
}

// 地图列表表格配置项
const tableOptions: TableOptions = {
  items: [
    {
      title: '地图名称',
      dataIndex: 'map_name'
    },
    {
      title: '地图类型',
      dataIndex: 'map_type',
      dictIndex: 'map_type'
    }
  ],
  actions: [
    {
      text: '选择',
      disabled: (record: Map) => {
        return record.map_name === state.selectedMap?.map_name
      },
      callback: (record: Map) => {
        globalStore.setLoading(true, '加载地图中')
        state.selectedMap = record
        if (state.selectedMap) {
          foxgloveClientStore.stopListenMessage(mapMsgHandler)
          foxgloveClientStore.unSubscribeTopic(state.mapSubId)
          state.drawManage.removeArrow()
          state.mapSubId = -1
        }
        foxgloveClientStore
          .callService('/tiered_nav_state_machine/get_grid_map', {
            info: record
          })
          .then((res) => {
            console.log(res)
            if (state.connecting) {
              modalRef.value.closeModal()
              // 调用服务连接地图
              // foxgloveClientStore
              //   .callService(
              //     '/tiered_nav_state_machine/add_cur_pose_as_edge',
              //     {}
              //   )
              //   .then((res) => {
              //     if (res === 0) message.success('连接成功')
              //   })
              message.success('连接成功')
            }
            const wrap = document.getElementById('navigationMap') as HTMLElement
            state.drawManage.drawGridMap(wrap, res.map, true)
            state.panzoomIns = state.drawManage.panzoomIns
            state.imgWrap = state.drawManage.imgWrap
            state.curState = STATE_MAP.PREVIEWING
            globalStore.setLoading(false)
          })
          .catch((err) => {
            console.log(err)
            globalStore.setLoading(false)
          })
      }
    }
  ],
  actionWidth: 50
}

// 获取地图列表
const listMaps = () => {
  globalStore.setLoading(true, '地图列表加载中')
  // 获取地图列表
  foxgloveClientStore
    .callService('/tiered_nav_conn_graph/list_maps', {})
    .then((res) => {
      console.log(res)
      state.maps = res.maps
      globalStore.setLoading(false)
    })
    .catch((err) => {
      globalStore.setLoading(false)
    })
}

// 指定初始位姿
const initPose = () => {
  // state.panzoomIns?.reset()
  state.adding = true
  state.drawManage.pzRemoveListener()
  state.drawManage.navAddListener()
  state.curState = STATE_MAP.INITING
  notification.success({
    placement: 'topRight',
    message: '请在地图按下并拖动鼠标来指定初始位姿',
    duration: 3
  })
}

// 完成初始位姿指定
const finishAdding = () => {
  state.adding = false
  globalStore.setLoading(true)
  state.drawManage.subscribeCarPosition()
  state.drawManage.subscribeScanPoints()
  foxgloveClientStore
    .callService('/tiered_nav_state_machine/switch_mode', {
      mode: 2
    })
    .then(() => {
      foxgloveClientStore
        .callService('/tiered_nav_state_machine/load_map', {
          p: {
            map_name: state.selectedMap?.map_name,
            t: {
              translation: state.drawManage.navTranslation,
              rotation: state.drawManage.navRotation
            }
          }
        })
        .then(() => {
          subscribeMapTopic()
          state.drawManage.advertiseNavTopic()
        })
    })
}

// 订阅map话题
const subscribeMapTopic = () => {
  globalStore.setLoading(true)
  state.curState = STATE_MAP.NAVIGATING
  // state.drawManage.launchNavigation()
  state.drawManage.navRemoveListener()
  state.drawManage.pzAddListener()
  globalStore.setLoading(false)
  if (state.mapSubId === -1) {
    globalStore.setLoading(true)
    foxgloveClientStore.subscribeTopic('/map').then((res) => {
      state.initFinish = true
      state.mapSubId = res
      foxgloveClientStore.listenMessage(mapMsgHandler)
      state.curState = STATE_MAP.NAVIGATING
      globalStore.setLoading(false)
    })
  }
}

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
    const wrap = document.getElementById('navigationMap') as HTMLElement
    state.drawManage.drawGridMap(wrap, parseData, true)
  }
}

// 连接地图
const connectMap = () => {
  modalRef.value.openModal({
    title: '温馨提示',
    type: 'normal',
    content: '确定以当前位置作为地图连接点吗？',
    callback: () => {
      state.connecting = true
      modalRef.value.openModal({
        title: '选择地图',
        type: 'table',
        tableOptions,
        dataSource: state.maps,
        closeModal: false,
        showMessage: false,
        callback: () => {
          modalRef.value.closeModal()
        }
      })
    }
  })
}

// 选择地图
const selectMap = () => {
  state.curState = STATE_MAP.SELECTING
  listMaps()
}

// 开/关导航模式(能够选择导航点)
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

// 结束导航
const closeNav = () => {
  // state.drawManage.closeNavigation()
  state.drawManage.navRemoveListener()
  state.drawManage.pzAddListener()
  state.curState = STATE_MAP.PAUSING
}

onMounted(() => {
  globalStore.setLoading(true, '地图列表加载中')
  setTimeout(() => {
    listMaps()
  }, 500)
})

onBeforeUnmount(() => {
  state.drawManage?.pzRemoveListener()
  state.drawManage?.navRemoveListener()
  state.drawManage.unSubscribeCarPosition()
  state.drawManage.unSubscribeScanPoints()
  state.drawManage.closeNavigation()
})
</script>

<style lang="less" scoped>
.navigation {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 15px;

  .view {
    flex-grow: 1;
    background: #fff;
    border: 10px solid #fff;
    .flex;
    overflow: hidden;

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

    .btn {
      width: 100%;
      .flex(center, center);
      gap: 10px;
      .switch {
        display: flex;
        gap: 5px;
      }
    }
  }
}

:deep(.Table) {
  &-header {
    font-size: 15px !important;
  }
}
</style>
