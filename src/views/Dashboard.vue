<template>
  <div class="Dashboard">
    <Header />
    <main class="Dashboard-main">
      <Menu />
      <Display />
    </main>
  </div>
</template>

<script setup lang="ts">
import Header from './Layout/Header.vue'
import Menu from './Layout/Menu.vue'
import Display from './Layout/Display.vue'
</script>

<style lang="less" scoped>
  .Dashboard{
    width: 100vw;
    min-width: 800px;
    height: 100vh;

    &-main{
      width: 100%;
      height: calc(100vh - @header-height);
      .flex;
    }
  }
</style>
