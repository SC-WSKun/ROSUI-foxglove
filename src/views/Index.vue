<template>
  <div class="index">
    <div class="center">
      <div class="logo">
        <img src="/robot-logo.png" />
        <h1>Ros 2 HMI</h1>
      </div>
      <a-form>
        <a-form-item
          label="机器人ID"
          :rules="[{ required: true }]"
          :validate-status="robotID === '' ? 'error' : ''"
          :help="robotID === '' ? '机器人ID不能为空' : ''"
        >
          <a-input v-model:value="robotID" placeholder="请输入机器人ID"/>
        </a-form-item>
      </a-form>
      <div class="bottom">
        <a-button class="a-button" type="primary" @click="connect">连接</a-button>
        <p class="toCreate">没有机器人？<span @click="create">去创建</span></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue';
import { useGlobalStore } from '@/stores/global';
import { useFoxgloveClientStore } from '@/stores/foxgloveClient';
import { useRtcClientStore } from '@/stores/rtcClient';
import type P2PSocket from '@/utils/p2psocket';
import CreateRobot from '@/components/CreateRobot.vue';


const globalStore = useGlobalStore();
const foxgloveClientStore = useFoxgloveClientStore();
const rtcClientStore = useRtcClientStore();
const router = useRouter();

const robotID = ref('robot_02');
let connectTimer: any = null;

const connect = () => {
  if (robotID.value === '') {
    return;
  }
  new Promise(async (resolve, reject) => {
    globalStore.setLoading(true, '连接中');
    const start = new Date().getTime();
    connectTimer = setInterval(() => {
      const end = new Date().getTime();
      if (end - start > 1000 * 30) {
        if (connectTimer)
          clearInterval(connectTimer);
        connectTimer = null;
        globalStore.setLoading(false);
        rtcClientStore.closeRtcClient();
      }
    })
    const socket: P2PSocket = await rtcClientStore.initRtcClient(robotID.value);
    clearInterval(connectTimer);
    connectTimer = null;
    foxgloveClientStore.initClient(socket);
    globalStore.setLoading(false);
    globalStore.setConnected(true);
    globalStore.setRobotID(robotID.value);
  }).then(() => {
    message.success('连接成功');
    router.push('/dashboard/virtualWall');
  }, () => {
    message.error('连接超时，请确认ID是否正确');
  });
};

const create = () => {
  globalStore.openModal({
    title: "创建机器人",
    type: "custom",
    component: CreateRobot,
    showFooter: false,
  });
}

</script>

<style lang="less">
h1 {
  margin: 0;
  text-align: center;
}
.index {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background-color: #e8f2ff;
  .center {
    .logo {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 20px;
      img {
        width: 50px;
        margin-right: 10px;
      }
    }
    .bottom {
      display: flex;
      gap: 15px;
      flex-direction: column;
      margin-top: 50px;
      .a-button {
        height: 40px;
      }
      .toCreate {
        font-size: 14px;
        color: #8b8b8b;
        text-align: center;
        margin: 0;
        span {
          cursor: pointer;
          color: #1890ff;
          text-decoration: underline;
        }
      }
    }
  }
}
</style>
