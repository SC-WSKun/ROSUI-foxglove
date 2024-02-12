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
            <a-button @click="addNavTask"> 添加导航地点 </a-button>
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
import { onMounted, reactive } from 'vue'
import { type Map } from '@/typings'
import type { TableOptions } from '@/typings/component'
import { drawGridMap } from '@/utils/draw'
import { pzAddListener, pzRemoveListener } from '@/utils/draw'
import { type PanzoomObject } from '@panzoom/panzoom'

interface State {
  maps: Map[]
  selectedMap: undefined | Map
  panzoomIns: PanzoomObject | undefined
  img: undefined | HTMLImageElement
}

const foxgloveClientStore = useFoxgloveClientStore()
const globalStore = useGlobalStore()

const state = reactive<State>({
  maps: [],
  selectedMap: undefined,
  panzoomIns: undefined,
  img: undefined
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
            const { panzoomIns, img } = drawGridMap(wrap, res.map, true)
            state.panzoomIns = panzoomIns
            state.img = img
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
  pzRemoveListener()
  // console.log(state.panzoomIns?.getTransformOrigin());
  // state.panzoomIns?.moveTo(0, 0)
  // state.panzoomIns?.zoomTo(0, 0, 0.5)
  // console.log(state.panzoomIns?.getTransform());
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
