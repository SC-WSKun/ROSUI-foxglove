<template>
  <div class="top-nav">
    <slot></slot>
    <JoyStick v-if="showJoyStick" :mode="mode"></JoyStick>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  showJoyStick: boolean;
  mode: boolean;
}>();
</script>

<style lang="less" scoped>
.top-nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  min-height: 170px;
  padding-left: 315px;
}
</style>
