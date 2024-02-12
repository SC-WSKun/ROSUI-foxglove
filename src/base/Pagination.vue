<template>
  <div class="Pagination">
    <a-pagination
      v-model:current="model.page.value"
      :total="model.total.value"
      show-less-items
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  model: any
}
const props = defineProps<Props>()

const onChange = (page: number, size: number) => {
  const { model } = props
  model.page.value = page
  model.size.value = size
  model.fetchList()
}
</script>

<style lang="less"></style>
