<template>
  <div class="Menu">
    <a-menu
      v-model:selectedKeys="state.selectedKeys"
      style="width: 256px"
      mode="inline"
      :open-keys="state.openKeys"
      :items="menuConfig"
      @select="onMenuSelected"
    ></a-menu>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import menuConfig from '../../config/menu'
import { useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import _ from 'lodash'
import { Config } from '@/typings'

interface State {
  selectedKeys: string[]
  openKeys: string[]
}

const state: State = reactive({
  selectedKeys: [],
  openKeys: []
})

const router = useRouter()

watch(
  router.currentRoute,
  (currentRoute: RouteLocationNormalizedLoaded) => {
    state.selectedKeys = [currentRoute.name as string]
    const match: any = _.find(menuConfig, (menu: Config.MenuConfig) => {
      if (menu.children) {
        return _.some(menu.children, ['key', currentRoute.name])
      }
      return menu.key === currentRoute.name
    })
    state.openKeys = [match?.key]
  },
  { immediate: true }
)

const onMenuSelected = (val: any) => {
  router.push(_.get(val, 'item.path'))
}
</script>

<style lang="less">
.Menu {
  width: @menu-width;
  height: 100%;
  background-color: #fff;
  overflow: hidden;
}
</style>