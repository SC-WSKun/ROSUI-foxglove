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
              :tableOptions="tabelOptions"
              :dataSource="state.maps"
              :loading="false"
            ></Table>
          </div>
        </div>
        <div class="map" v-else>
          <div class="btn" v-if="!state.initFinish">
            <a-button type="primary" v-if="state.adding" @click="finishAdding"
              >完成</a-button
            >
            <a-button @click="addNavTask" v-else>指定初始位姿</a-button>
          </div>
          <JoyStick v-else></JoyStick>
        </div>
      </a-card>
    </div>
    <Modal ref="modalRef" />
  </div>
</template>

<script setup lang="ts">
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useGlobalStore } from '@/stores/global'
import { onMounted, reactive } from 'vue'
import { type GridMap, type Map } from '@/typings'
import type { TableOptions } from '@/typings/component'
import type { MessageData } from '@foxglove/ws-protocol'
import DrawManage from '@/utils/draw'
import { type PanzoomObject } from '@panzoom/panzoom'
import { notification } from 'ant-design-vue'

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
  goalChannelId: undefined
})

const tabelOptions: TableOptions = {
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
      callback: (record: Map) => {
        globalStore.setLoading(true, '加载地图中')
        state.selectedMap = record
        foxgloveClientStore
          .callService('/tiered_nav_state_machine/get_grid_map', {
            info: record
          })
          .then((res) => {
            console.log(res)
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

const addNavTask = () => {
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
    foxgloveClientStore.unSubscribeTopic(state.mapSubId)
  }
}

onMounted(() => {
  listMaps()
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
