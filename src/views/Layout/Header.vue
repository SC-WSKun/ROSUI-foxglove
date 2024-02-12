<template>
  <div class="Header">
    <div class="Header-logo" @click="onClickLogo">
      <img src="/robot.png" />
      <!-- <RobotOutlined :style="{fontSize: '40px'}"/> -->
      RosUI-Foxglove
    </div>
    <div class="Header-info">
      <a-dropdown>
        <a class="ant-dropdown-link" @click.prevent>
          操作
          <DownOutlined :style="{ fontSize: '12px' }" />
        </a>
        <template #overlay>
          <a-empty
            v-if="!menus.length"
            :image="emptyImage"
            description="no data"
            :image-style="{
              margin: '30px 40px',
              marginBottom: '10px'
            }"
          ></a-empty>
          <a-menu @click="handleMenuClick" v-else>
            <a-menu-item v-for="item in menus" :key="item.key">
              <span>{{ item.text }}</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
  <Modal ref="modalRef"></Modal>
</template>

<script setup lang="ts">
import {
  LogoutOutlined,
  DownOutlined,
  RobotOutlined
} from '@ant-design/icons-vue'
import { Empty } from 'ant-design-vue'
import { useRouter } from 'vue-router'
// import { useUserStore } from '@/stores/user'
import { ref } from 'vue'
// import ImportUsers from '@/components/importUsers.vue'

const router = useRouter()
// const userStore = useUserStore()
const modalRef: any = ref(null)
const emptyImage = Empty.PRESENTED_IMAGE_SIMPLE

const menus: any[] = [
  // {
  //   text: '导入用户',
  //   key: 'import'
  // }
]

const logout = () => {
  modalRef.value.openModal({
    type: 'normal',
    title: '提示',
    content: '确定退出吗?',
    doneMsg: '退出成功',
    callback: () => {
      // userStore.logout()
      router.replace('/login')
    }
  })
}

const handleMenuClick = ({ key }: { key: string }) => {
  switch (key) {
    case 'import':
      importUser()
      break
    default:
      break
  }
}

const importUser = () => {
  modalRef.value.openModal({
    type: 'custom',
    title: '导入用户',
    showFooter: false,
    showMessage: false
    // component: ImportUsers
  })
}

const onClickLogo = () => {
  router.push('/')
}
</script>

<style lang="less">
.Header {
  width: 100vw;
  height: @header-height;
  min-width: 800px;
  // background-color: @theme-color1;
  background: linear-gradient(180deg, @gradient-color1, @gradient-color2);
  .flex(space-between);
  padding: 0 30px;

  &-logo {
    height: 100%;
    color: #000;
    font-size: @font-size-large;
    font-weight: bold;
    .flex;
    cursor: pointer;

    img {
      height: 100%;
    }
  }

  &-info {
    .flex();

    .logout {
      color: @white-font-color;
    }
  }
}

.ant-dropdown-link {
  color: @white-font-color;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 6px;
  transition: all 0.3s;
  margin-right: 20px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
