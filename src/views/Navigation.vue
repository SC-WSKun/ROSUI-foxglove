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
          <div class="btn" v-if="!state.maps.length">
            <a-button @click="listMaps"> 获取地图列表 </a-button>
          </div>
          <div class="list" v-else>
            <Table
              :tableOptions="tabelOptions"
              :dataSource="state.maps"
              :loading="false"
            ></Table>
          </div>
        </div>
        <div class="map" v-else>
          <div class="btn">
            <a-button type="primary" v-if="state.adding" @click="finishAdding"
              >完成</a-button
            >
            <a-button @click="addNavTask" v-else>指定初始位姿</a-button>
          </div>
          <JoyStick></JoyStick>
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
import { drawGridMap } from '@/utils/draw'
import type { MessageData } from '@foxglove/ws-protocol'
import {
  pzAddListener,
  pzRemoveListener,
  navAddListener,
  navRemoveListener
} from '@/utils/draw'
import { type PanzoomObject } from '@panzoom/panzoom'
import { notification } from 'ant-design-vue'

interface State {
  maps: Map[]
  selectedMap: undefined | Map
  panzoomIns: PanzoomObject | undefined
  imgWrap: undefined | HTMLElement
  adding: boolean
  mapSubId: number
}

const foxgloveClientStore = useFoxgloveClientStore()
const globalStore = useGlobalStore()

const state = reactive<State>({
  maps: [],
  selectedMap: undefined,
  panzoomIns: undefined,
  imgWrap: undefined,
  adding: false,
  mapSubId: -1
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
            const { panzoomIns, imgWrap } = drawGridMap(wrap, res.map, true)
            state.panzoomIns = panzoomIns
            state.imgWrap = imgWrap
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
  globalStore.setLoading(true)
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
  pzRemoveListener()
  navAddListener()
}

const finishAdding = () => {
  state.adding = false
  pzAddListener()
  navRemoveListener()
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
              translation: {
                x: 300,
                y: 300,
                z: 0
              },
              rotation: {
                x: 0,
                y: 0,
                z: 0,
                w: 1
              }
            }
          }
        })
        .then((res1) => {
          console.log('res1', res1)
          foxgloveClientStore.subscribeTopic('/map').then((res2) => {
            globalStore.setLoading(false)
            state.mapSubId = res2
            notification.success({
              placement: 'topRight',
              message:
                '请通过【右下角摇杆】 或 键盘的【上下左右键】进行操控小车',
              duration: 3
            })
            foxgloveClientStore.listenMessage(mapMsgHandler)
          })
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
    const wrap = document.getElementById('navigationMap') as HTMLElement
    drawGridMap(wrap, parseData)
  }
}

onMounted(() => {})
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
