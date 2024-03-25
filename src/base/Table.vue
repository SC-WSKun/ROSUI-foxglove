<template>
  <div class="Table">
    <a-table
      :columns="items"
      :data-source="dataSource"
      bordered
      :pagination="tableOptions.pagination || false"
      :size="tableOptions.size || 'small'"
      :loading="loading.value"
    >
      <template #headerCell="{ title, column }">
        <span class="Table-header"> {{ title }} </span>
      </template>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.type === 'link'">
          <a :href="getByDictKey(_.get(record, column.dataIndex), column)">{{
            getByDictKey(_.get(record, column.dataIndex), column)?.substring(
              0,
              13
            )
          }}</a>
        </template>
        <template v-else-if="column.type === 'actions'">
          <template v-for="action in column.actions" :key="action.text">
            <template v-if="!action.showFilter || action.showFilter(record)">
              <a-popconfirm
                v-if="action.type === 'popconfirm'"
                :title="action.title"
                :ok-text="action.confirmText || '确定'"
                cancel-text="取消"
                @confirm="action.callback(record)"
              >
                <a-button
                  type="link"
                  :danger="action.danger"
                  :disabled="action.disabled && action.disabled(record)"
                  >{{ action.text }}</a-button
                >
              </a-popconfirm>
              <a-button
                v-else
                type="link"
                :danger="action.danger"
                :disabled="action.disabled && action.disabled(record)"
                @click="action.callback(record)"
                >{{ action.text }}</a-button
              >
            </template>
          </template>
        </template>
        <template v-else-if="column.type === 'custom'">
          <div v-html="column.render(record)"></div>
        </template>
        <template v-else>
          <span>{{
            getByDictKey(_.get(record, column.dataIndex), column)
          }}</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import type { TableOptions, TableItem } from '@/typings/component'
import Dict from '@/dict'
import _ from 'lodash'

interface Props {
  tableOptions: TableOptions
  dataSource: any[]
  loading: Ref<boolean>
}

const props = defineProps<Props>()

const items = computed(() => {
  const { actions } = props.tableOptions
  if (!props.tableOptions.actions) return props.tableOptions.items
  return [
    ...props.tableOptions.items,
    {
      title: '操作',
      dataIndex: '',
      type: 'actions',
      actions,
      width: props.tableOptions.actionWidth || 300
    }
  ]
})

const getByDictKey = (value: any, column?: any) => {
  const itemOption = _.find(
    props.tableOptions.items,
    column.key ? { key: column.key } : { dataIndex: column.dataIndex }
  ) as TableItem
  return itemOption.dictIndex
    ? _.get(Dict, `${itemOption.dictIndex}.${value}`)
    : value
}

</script>

<style lang="less" scoped>
.Table {
  &-header {
    display: block;
    height: 30px;
    .flex(flex-start);
    font-size: @font-size-normal;
  }
}
</style>
