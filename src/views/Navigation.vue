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
        <div class="select" v-if="!state.selectedMap">
          <div class="list">
            <Table
              :tableOptions="tableOptions"
              :dataSource="state.maps"
              :loading="false"
            ></Table>
          </div>
        </div>
        <div class="map" v-else>
          <div class="btn" v-if="!state.initFinish">
            <a-button type="primary" v-if="state.adding" @click="finishAdding">
              完成
            </a-button>
            <a-button @click="initPose" v-else>指定初始位姿</a-button>
          </div>
          <div class="btn" v-else>
            <JoyStick></JoyStick>
            <a-button @click="connectMap">连接地图</a-button>
          </div>
        </div>
      </a-card>
    </div>
    <Modal ref="modalRef" />
  </div>
</template>

<script setup lang="ts">
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useGlobalStore } from '@/stores/global'
import { onMounted, reactive, ref } from 'vue'
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
  connecting: false
})

const modalRef: any = ref(null)

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
  state.panzoomIns?.reset()
  state.adding = true
  state.drawManage.pzRemoveListener()
  state.drawManage.navAddListener()
  notification.success({
    placement: 'topRight',
    message: '请在地图按下并拖动鼠标来指定初始位姿',
    duration: 3
  })
}

// 完成初始位姿指定
const finishAdding = () => {
  state.adding = false
  state.drawManage.pzAddListener()
  state.drawManage.navRemoveListener()
  globalStore.setLoading(true)
  foxgloveClientStore
    .callService('/tiered_nav_state_machine/switch_mode', {
      mode: 2
    })
    .then((res) => {
      console.log(res)
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
        .then((res1) => {
          console.log('res1', res1)
          foxgloveClientStore.subscribeTopic('/map').then((res2) => {
            globalStore.setLoading(false)
            state.initFinish = true
            state.mapSubId = res2
            foxgloveClientStore.listenMessage(mapMsgHandler)
          })
          state.drawManage.launchNavigation()
        })
    })
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
    console.log(parseData)

    const wrap = document.getElementById('navigationMap') as HTMLElement
    state.drawManage.drawGridMap(wrap, parseData)
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

onMounted(() => {
  globalStore.setLoading(true, '地图列表加载中')
  setTimeout(() => {
    listMaps()
  }, 500)
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
    }
  }
}

/deep/ .Table {
  &-header {
    font-size: 15px !important;
  }
}
</style>
