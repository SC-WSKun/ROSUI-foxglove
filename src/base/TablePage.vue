<template>
  <div class="TablePage">
    <div class="TablePage-title">
      {{ title || '表格标题' }}
    </div>
    <div class="TablePage-action">
      <slot name="action"></slot>
    </div>
    <div class="TablePage-search" v-if="tableOptions.search">
      <Search :searchOptions="tableOptions.search" :model="model" :preHook="tableOptions.search.preHook"></Search>
    </div>
    <div class="TablePage-table">
      <Table
        :tableOptions="tableOptions"
        :dataSource="model.list"
        :loading="model.loading"
      ></Table>
    </div>
    <div class="TablePage-pagination">
      <Pagination :model="model"></Pagination>
    </div>
    <Modal ref="ModalRef" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type TableOptions } from '@/typings/component'
import Modal from './Modal.vue'

interface Props {
  title: string
  tableOptions: TableOptions
  model: any
}

const props = defineProps<Props>()
const ModalRef: any = ref(null)

onMounted(() => {
  props.model.initModal(ModalRef.value)
  if(!props.tableOptions.search){
    props.model.fetchList()
  }
})
</script>

<style lang="less">
.TablePage {
  width: 100%;
  height: 100%;
  padding: 18px 28px;

  &-title {
    font-size: @font-size-large;
    font-weight: bold;
    letter-spacing: 2px;
  }

  &-action {
    width: 100%;
    .flex(flex-end);
    margin: 10px 0;
  }

  &-search{
    padding: 12px 10px 5px;
    background: #fff;
    border-radius: 10px;
  }

  &-table {
    margin: 10px 0 0;
    background: #fff;
  }

  &-pagination {
    padding: 20px 0;
    .flex(flex-end);
  }
}
</style>
