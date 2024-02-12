<template>
  <div class="Display">
    <RouterView></RouterView>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style lang="less">
.Display {
  flex: 1;
  height: calc(100vh - @header-height);
  overflow-y: auto;
  background: @main-background-color;
  padding: 20px 15px 10px 15px;
}
</style>
