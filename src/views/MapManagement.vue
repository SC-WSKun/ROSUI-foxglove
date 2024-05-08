<template>
  <div class="map-management">
    <div class="header">
      <h2 class="title">地图列表</h2>
      <a-button type="primary" @click="fetchData" v-if="state.fail"
        >重新获取</a-button
      >
    </div>
    <Table
      :tableOptions="tableOptions"
      :dataSource="state.data"
      :loading="state.loading"
    ></Table>
  </div>
</template>

<script setup lang="ts">
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'
import { useGlobalStore } from '@/stores/global'
import type { Map } from '@/typings'
import { message } from 'ant-design-vue'
import { onMounted, reactive } from 'vue'

const foxgloveClientStore = useFoxgloveClientStore()
const globalStore = useGlobalStore()

const state = reactive({
  data: [],
  loading: false,
  fail: false
})

const tableOptions = {
  items: [
    {
      title: '地图名称',
      dataIndex: 'map_name'
    },
    {
      title: '地图类型',
      dataIndex: 'map_type',
      dictIndex: 'map_type'
    },
    {
      title: '导航模式',
      dataIndex: 'nav_mode'
    }
  ],
  actions: [
    {
      text: '取消连接关系',
      callback: (record: Map) => {
        globalStore.openModal({
          title: '选择取消连接的地图',
          type: 'table',
          tableOptions: {
            items: [
              {
                title: '地图名称',
                dataIndex: 'map_name'
              }
            ],
            actions: [
              {
                text: '选择',
                type: 'popconfirm',
                title: '确定取消连接吗？',
                disabled: (target: Map) => record.map_name === target.map_name,
                callback: (target: Map) => {
                  foxgloveClientStore
                    .callService('/tiered_nav_conn_graph/rm_edge', {
                      from_map: record.map_name,
                      to_map: target.map_name
                    })
                    .then((res) => {
                      if (!res.result) throw new Error('取消失败')
                      message.success('取消成功')
                      state.loading = false
                    })
                    .catch((err) => {
                      message.error('取消失败，请确定地图是否联通')
                    })
                }
              }
            ],
            actionWidth: 100,
            pagination: true
          },
          dataSource: state.data,
          showFooter: false
        })
      }
    },
    {
      text: '删除',
      type: 'popconfirm',
      title: '确定删除该地图吗？',
      danger: true,
      callback: (record: Map) => {
        state.loading = true
        foxgloveClientStore
          .callService('/tiered_nav_conn_graph/rm_map', {
            map: record.map_name
          })
          .then((res) => {
            if (!res.result) throw new Error('删除失败')
            message.success(`成功删除地图【${record.map_name}】`)
            fetchData()
          })
          .catch((err) => {
            message.error(`删除地图【${record.map_name}】失败，请稍后再试`)
            state.loading = false
          })
      }
    }
  ],
  pagination: true,
  size: 'middle'
}

const fetchData = () => {
  state.loading = true
  foxgloveClientStore
    .callService('/tiered_nav_conn_graph/list_maps', {})
    .then((res) => {
      state.data = res.maps
      state.fail = false
    })
    .catch((err) => {
      message.error('获取地图列表失败，请稍后再试')
      state.fail = true
      state.loading = false
    })
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="less" scoped>
.map-management {
  width: 100%;
  height: 100%;
  padding: 15px;
  background-color: #fff;
  overflow: auto;

  .header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
