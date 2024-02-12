<template>
  <div class="Search">
    <div class="Search-form" :class="{ collapse }">
      <Form :formOptions="searchOptions" ref="formRef" />
    </div>
    <a-button
      type="link"
      size="small"
      style="margin-left: 10px"
      @click="triggerCollapse"
      v-if="showCollapse"
    >
      <DownOutlined v-if="!collapse" />
      <UpOutlined v-else />
    </a-button>
    <div class="Search-operation">
      <a-button
        :icon="h(SearchOutlined)"
        type="primary"
        @click="onHandleSearch"
      />
      <a-button :icon="h(ReloadOutlined)" @click="onHandleClear" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, onMounted, type Ref, nextTick, watch } from 'vue'
import {
  SearchOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons-vue'
import type { SearchOptions } from '@/typings/component'

interface Props {
  searchOptions: SearchOptions
  model: any
  preHook?: (...params: any) => any
}
const props = defineProps<Props>()

const formRef: any = ref(null)
const collapse: Ref<boolean> = ref(false)
const showCollapse = computed(() => {
  const { items, cols } = props.searchOptions
  if (!items) return false
  if (!cols) return items.length > 1
  return items.length > cols
})

const triggerCollapse = () => {
  collapse.value = !collapse.value
}

const onHandleSearch = () => {
  const form = JSON.parse(JSON.stringify(formRef.value.formFields))
  if(props.preHook) props.preHook(form)
  props.model.fetchList(Object.assign(form, { page: 1 }))
}

const onHandleClear = () => {
  formRef.value.clearFields()
  props.model.fetchList(Object.assign(formRef.value.formFields, { page: 1 }))
}

const initQuery = computed(() => {
  return props.searchOptions.items?.reduce((prev, curr) => {
    if (curr.defaultValue) prev[curr.key] = curr.defaultValue()
    else prev[curr.key] = undefined
    return prev
  }, {} as any)
})

onMounted(() => {
  props.model.fetchList(initQuery.value)
})
</script>

<style lang="less">
.ant-form-item {
  margin-bottom: 10px;
}
</style>

<style lang="less" scoped>
.Search {
  .flex(center, flex-start);

  &-form {
    flex-grow: 1;
    height: 40px;
    overflow: hidden;

    &.collapse {
      height: auto;
    }
  }

  &-operation {
    width: 80px;
    margin-left: 10px;
    .flex(space-evenly);
  }
}
</style>
