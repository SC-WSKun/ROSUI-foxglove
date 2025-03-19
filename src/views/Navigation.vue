<template>
  <div class="navigation">
    <TopNav :showJoyStick="globalStore.state.connected" :mode="state.curState >= 3">
      <div
        class="btns"
        v-disable="patroling"
      >
        <!-- 0. 等待用户获取地图列表 -->
        <div class="btn" v-if="state.curState === 0">
          <a-button @click="selectMap" type="primary">选择地图</a-button>
        </div>
        <!-- 1. 预览 -->
        <div class="btn" v-if="state.curState === 1">
          <a-button @click="initPose">指定初始位姿</a-button>
        </div>
        <!-- 2. 指定初始位姿 -->
        <div class="btn" v-if="state.curState === 2">
          <div class="btn-line">
            <a-button type="primary" @click="finishAdding"> 完成 </a-button>
            <a-button @click="cancelInitPose">取消</a-button>
          </div>
        </div>
        <!-- 3. 导航 -->
        <div class="btn" v-if="state.curState === 3">
          <a-button @click="connectMap">连接地图</a-button>
          <div class="btn-line">
            <div class="switch"><a-switch v-model:checked="state.navigating" :disabled="patroling"></a-switch>导航模式</div>
            <a-button @click="crossNav" type="primary">跨图导航</a-button>
            <a-button
              @click="pauseNav"
              type="primary"
              :icon="h(PauseOutlined)"
              danger
              >暂停导航</a-button
            >
          </div>
          <div class="btn-line">
            <div class="switch"><a-switch v-model:checked="state.marking" :disabled="patroling"></a-switch>标点模式</div>
          </div>
          <div class="btn-line" v-show="state.marking">
            <div class="switch"><a-switch v-model:checked="patrolStore.patrolMode" :disabled="patroling"></a-switch>巡逻模式</div>
            <a-button :data-notDisable="true" @click="patrolManage" type="primary" v-show="patrolStore.patrolMode">巡逻管理</a-button>
            <a-button
              :data-notDisable="true"
              type="primary"
              @click="stopPatrol"
              v-show="patrolStore.patrolMode"
            >
              停止巡逻
            </a-button>
          </div>
        </div>
        <!-- 4. 暂停导航 -->
        <div class="btn" v-if="state.curState === 4">
          <div class="btn-line">
            <a-button
              @click="resumeNav"
              type="primary"
              :icon="h(CaretRightOutlined)"
            >恢复导航</a-button>
            <a-button @click="selectMap">重新选择地图</a-button>
            <a-button
              @click="closeNav"
              :icon="h(StopOutlined)"
              type="primary"
              danger
            >结束导航</a-button>
          </div>
        </div>
        <!-- 5. 连接地图 -->
        <div class="btn" v-if="state.curState === 5">
          <a-button @click="confirmConnect" type="primary">确认连接</a-button>
          <a-button @click="cancelConnect">取消连接操作</a-button>
        </div>
      </div>
    </TopNav>
    <div class="view" id="navigationMap">
      <div class="tips" v-if="state.curState === 0">请先选择地图</div>
      <div id="mapImgWrap">
        <VirtualWallCom
          v-if="state.curState > 0"
          :drawManage="state.drawManage"
          :mapName="state.mapName"
          style="pointer-events: none;"
        />
      </div>
    </div>
    <a-modal
      v-model:open="globalStore.state.showLabelInput"
      title="添加标记"
      @ok="confirmLabel"
      @cancel="cancelLabel"
    >
      <a-input
        v-model:value="state.newLabelName"
        placeholder="请输入标记名称"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { useFoxgloveClientStore } from "@/stores/foxgloveClient";
import {
  CaretRightOutlined,
  PauseOutlined,
  SaveOutlined,
  StopOutlined,
} from "@ant-design/icons-vue";
import { useGlobalStore } from "@/stores/global";
import { usePatrolStore, usePatrolStoreToRefs } from "@/stores/patrol";
import { onBeforeUnmount, reactive, h, watch, ref } from "vue";
import { type GridMap, type Map, type GridPlan } from "@/typings";
import type { TableOptions } from "@/typings/component";
import type { MessageData } from "@foxglove/ws-protocol";
import DrawManage from "@/utils/draw";
import { message, notification } from "ant-design-vue";
import Patrol from "@/components/Patrol.vue";
import VirtualWallCom from "@/components/VirtualWallCom.vue";
import TopNav from "@/components/TopNav.vue";

interface State {
  maps: Map[];
  selectedMap: Map | null;
  mapSubId: number;
  planSubId: number;
  drawManage: DrawManage;
  connecting: boolean;
  curState: number;
  navigating: boolean;
  marking: boolean;
  crossing: boolean;
  candidateMap: Map | null;
  lastState: number;
  newLabelName: string;
  mapName: string;
}

const foxgloveClientStore = useFoxgloveClientStore();
const globalStore = useGlobalStore();
const patrolStore = usePatrolStore();
const { patroling } = usePatrolStoreToRefs();

const state = reactive<State>({
  maps: [],
  selectedMap: null,
  mapSubId: -1,
  planSubId: -1, // 轨迹话题id
  drawManage: new DrawManage(),
  connecting: false, // 连接地图ing
  curState: 0, // 当前状态step
  navigating: false, // 导航ing
  marking: false, // 标点ing
  crossing: false, // 跨图导航ing
  candidateMap: null, // 选择的地图，未指定初始位姿
  lastState: 0, // 上一个状态，针对指定初始位姿的取消操作
  newLabelName: "",
  mapName: "",
});

const STATE_MAP = {
  WAITING: 0, // 等待获取地图
  PREVIEWING: 1, // 预览地图
  INITING: 2, // 初始化位姿
  NAVIGATING: 3, // 导航
  PAUSING: 4, // 暂停
  CONNECTING: 5, // 连接地图
};

watch(
  () => globalStore.state.connected,
  (newVal: boolean) => {
    // 异常中断兜底逻辑
    if (!newVal) {
      state.curState = STATE_MAP.WAITING;
      unSubscribeMapTopic();
      state.drawManage?.unSubscribeCarPosition();
      state.drawManage?.unSubscribeScanPoints();
      state.drawManage?.pzRemoveListener();
      state.drawManage?.navRemoveListener();
      state.drawManage?.unAdvertiseNavTopic();
      state.drawManage?.clear();
      state.selectedMap = null;
    }
  },
);

watch(
  () => state.navigating,
  () => {
    switchNavigation();
  },
);

watch(
  () => state.marking,
  () => {
    switchMarking();
  },
);

watch(
  () => patrolStore.patrolMode,
  () => {
    switchPatroling();
  },
);

// 地图列表表格配置项
const tableOptions: TableOptions = {
  items: [
    {
      title: "地图名称",
      dataIndex: "map_name",
    },
    {
      title: "地图类型",
      dataIndex: "map_type",
      dictIndex: "map_type",
    },
  ],
  actions: [
    {
      text: "选择",
      disabled: (record: Map) => {
        return record.map_name === state.selectedMap?.map_name;
      },
      callback: async (record: Map) => {
        // 跨图导航时校验地图是否连通
        if (state.crossing) {
          const pathRes: any = await foxgloveClientStore.callService(
            "/tiered_nav_state_machine/query_path_to_map",
            {
              to_map: record.map_name,
            },
          );
          if (!pathRes.result) {
            globalStore.setLoading(false);
            message.error("地图不连通，请重新选择");
            return;
          }
        }
        globalStore.setLoading(true, "加载地图中");
        state.candidateMap = record;

        foxgloveClientStore
          .callService("/tiered_nav_state_machine/get_grid_map", {
            info: record,
          })
          .then((res) => {
            state.drawManage.unSubscribeCarPosition();
            state.drawManage.unSubscribeScanPoints();
            unSubscribeMapTopic();
            const wrap = document.getElementById(
              "navigationMap",
            ) as HTMLElement;
            state.drawManage.drawGridMap(wrap, res.map, true);
            state.curState = STATE_MAP.PREVIEWING;
            globalStore.setLoading(false);
            initPose();
            globalStore.closeModal();
            state.mapName = record.map_name;
          })
          .catch((err) => {
            console.log(err);
            globalStore.setLoading(false);
          });
      },
    },
  ],
  actionWidth: 50,
  pagination: true,
};

// 获取地图列表
const listMaps = () => {
  return new Promise((resolve, reject) => {
    globalStore.setLoading(true, "正在获取最新地图列表");
    // 获取地图列表
    foxgloveClientStore
      .callService("/tiered_nav_conn_graph/list_maps", {})
      .then((res) => {
        state.maps = res.maps;
        globalStore.setLoading(false);
        resolve(res.maps);
      })
      .catch((err) => {
        message.error("获取地图列表失败，请稍后再试");
        globalStore.setLoading(false);
      });
  });
};

// 指定初始位姿
const initPose = () => {
  state.drawManage.navDisabled = true;
  state.curState = STATE_MAP.INITING;
  state.drawManage.resetPanzoom();
  state.navigating = true;
};

// 完成初始位姿指定
const finishAdding = async () => {
  globalStore.setLoading(true);
  state.drawManage.subscribeCarPosition();
  state.drawManage.subscribeScanPoints();
  if (!state.connecting && !state.crossing) {
    await foxgloveClientStore.callService(
      "/tiered_nav_state_machine/switch_mode",
      {
        mode: 2,
      },
    );
  }
  // 跨图导航
  if (state.crossing) {
    state.selectedMap = state.candidateMap;
    state.candidateMap = null;
    state.drawManage.publishNavigation(state.selectedMap?.map_name);
    subscribeMapTopic();
    state.curState = STATE_MAP.NAVIGATING;
    state.crossing = false;
    state.drawManage.navDisabled = false;
  } else {
    // 指定初始位姿或连接点
    foxgloveClientStore
      .callService("/tiered_nav_state_machine/load_map", {
        p: {
          map_name: state.candidateMap?.map_name,
          t: {
            translation: state.drawManage.navTranslation,
            rotation: state.drawManage.navRotation,
          },
        },
      })
      .then(() => {
        subscribeMapTopic();
        state.curState = STATE_MAP.NAVIGATING;
        if (state.connecting) state.curState = STATE_MAP.CONNECTING;
        state.drawManage.advertiseNavTopic();
        state.drawManage.setPanzoomPartialMap();
        state.drawManage.navDisabled = false;
        globalStore.setLoading(false);
        state.selectedMap = state.candidateMap;
        state.candidateMap = null;
      });
  }
};

// 订阅map话题
const subscribeMapTopic = () => {
  globalStore.setLoading(true);
  state.navigating = false;
  globalStore.setLoading(false);
  if (state.mapSubId === -1) {
    globalStore.setLoading(true);
    foxgloveClientStore.subscribeTopic("/map").then((res) => {
      state.mapSubId = res;
      foxgloveClientStore.listenMessage(mapMsgHandler);
      globalStore.setLoading(false);
    });
  }
};

// 停止订阅map话题
const unSubscribeMapTopic = () => {
  foxgloveClientStore.stopListenMessage(mapMsgHandler);
  foxgloveClientStore.unSubscribeTopic(state.mapSubId);
  state.mapSubId = -1;
};

// 地图消息监听回调
const mapMsgHandler = ({
  op,
  subscriptionId,
  timestamp,
  data,
}: MessageData) => {
  if (state.mapSubId === subscriptionId) {
    const parseData = foxgloveClientStore.readMsgWithSubId(
      state.mapSubId,
      data,
    ) as GridMap;
    const wrap = document.getElementById("navigationMap") as HTMLElement;
    // todo 注释掉，不需要一直更新
    // state.drawManage.drawGridMap(wrap, parseData, true);
  }
};

// 连接地图
const connectMap = () => {
  state.connecting = true;
  state.lastState = state.curState;
  globalStore.openModal({
    title: "选择地图",
    type: "table",
    tableOptions,
    dataSource: state.maps,
    showMsg: false,
    showFooter: false,
    onCancel: () => {
      if (state.connecting) {
        state.connecting = false;
      }
    },
  });
};

// 选择地图
const selectMap = () => {
  state.lastState = state.curState;
  console.log(state.lastState);

  listMaps().then((res) => {
    globalStore.openModal({
      title: "选择地图",
      type: "table",
      tableOptions,
      dataSource: res,
      showFooter: false,
    });
  });
};

// 确认连接地图
const confirmConnect = () => {
  globalStore.openModal({
    title: "提示",
    type: "normal",
    content: "确定以当前位置作为连接点吗？",
    callback: () => {
      console.log("连接地图");
      globalStore.setLoading(true, "连接中");
      // 调用服务连接地图
      foxgloveClientStore
        .callService("/tiered_nav_state_machine/add_cur_pose_as_edge", {})
        .then((res1) => {
          console.log("connect res", res1);
          if (res1 === 0) message.success("连接成功");
          state.connecting = false;
          state.curState = STATE_MAP.NAVIGATING;
          globalStore.setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          globalStore.setLoading(false);
          message.error("连接失败，请稍后再试");
        });
    },
  });
};

const planMsgHandler = ({
  op,
  subscriptionId,
  timestamp,
  data,
}: MessageData) => {
  if (state.planSubId === subscriptionId) {
    const parseData = foxgloveClientStore.readMsgWithSubId(
      state.planSubId,
      data,
    ) as GridPlan;
    console.log('curve msg', parseData);
    state.drawManage.drawCurve(parseData);
  }
}

// 订阅轨迹话题
const subscribePlanTopic = () => {
  if (state.planSubId !== -1) return;
  globalStore.setLoading(true);
  foxgloveClientStore.subscribeTopic("/plan").then((res) => {
    state.planSubId = res;
    foxgloveClientStore.listenMessage(planMsgHandler);
  }).finally(() => {
    globalStore.setLoading(false);
  });
};

const unSubscribePlanTopic = () => {
  foxgloveClientStore.stopListenMessage(planMsgHandler);
  foxgloveClientStore.unSubscribeTopic(state.planSubId);
  state.planSubId = -1;
};

// 巡逻管理 
const patrolManage = () => {
  globalStore.openModal({
    title: "巡逻管理",
    type: "custom",
    props: {
      drawManage: state.drawManage
    },
    component: Patrol,
    showFooter: false,
    width: 1000,
  });
}

// 跨图导航
const crossNav = () => {
  state.crossing = true;
  state.navigating = false;
  state.lastState = state.curState;
  globalStore.openModal({
    title: "跨图导航",
    type: "table",
    tableOptions,
    dataSource: state.maps,
    showFooter: false,
    onCancel: () => {
      state.crossing = false;
    },
  });
};

// 开/关导航模式(能够选择导航点)
const switchNavigation = () => {
  if (state.navigating) {
    state.drawManage.pzRemoveListener();
    state.drawManage.navAddListener();
    notification.success({
      placement: "topRight",
      message: `请在地图按下并拖动鼠标来指定${
        state.crossing ? "【导航目标位姿】" : "【初始位姿】"
      }`,
      duration: 3,
    });
    subscribePlanTopic();
    message.info('地图缩放拖拽功能已关闭');
  } else {
    state.drawManage.navRemoveListener();
    state.drawManage.pzAddListener();
    unSubscribePlanTopic();
    message.info('地图缩放拖拽功能已开启');
  }
};

// 暂停导航
const pauseNav = () => {
  state.navigating = false;
  state.curState = STATE_MAP.PAUSING;
  
  state.marking = false;
  patrolStore.patrolMode = false;
  patrolStore.exitPatrol();
};

// 恢复导航
const resumeNav = () => {
  state.curState = STATE_MAP.NAVIGATING;
  subscribeMapTopic();
};

// 结束导航
const closeNav = () => {
  globalStore.openModal({
    title: "结束导航",
    type: "normal",
    content: "是否结束当前导航？",
    showMsg: false,
    callback: () => {
      globalStore.setLoading(true, "请稍等");
      foxgloveClientStore
        .callService("/tiered_nav_state_machine/switch_mode", {
          mode: 0,
        })
        .then(() => {
          unSubscribeMapTopic();
          state.drawManage.unSubscribeCarPosition();
          state.navigating = false;
          state.drawManage.unSubscribeScanPoints();
          state.drawManage.unAdvertiseNavTopic();
          state.curState = STATE_MAP.WAITING;
          state.selectedMap = null;
          state.drawManage.clear();
          globalStore.setLoading(false);
          message.warning("导航已结束");
        });
    },
  });
};

// 取消指定初始位姿
const cancelInitPose = () => {
  state.candidateMap = null;
  if (state.selectedMap) {
    subscribeMapTopic();
    state.drawManage.subscribeCarPosition();
    state.drawManage.subscribeScanPoints();
    state.curState = state.lastState;
    console.log(state.lastState, state.curState);
    if (state.connecting) state.connecting = false;
  } else {
    state.drawManage.clear();
    state.curState = STATE_MAP.WAITING;
  }
};

// 取消连接地图操作
const cancelConnect = () => {
  state.connecting = false;
  message.success("连接操作已取消");
  state.curState = state.lastState;
};

// 切换标点模式
const switchMarking = () => {
  if (state.marking) {
    state.drawManage.labelAddListener();
    notification.success({
      placement: "topRight",
      message: "开启标点模式",
      duration: 3,
    });
  } else {
    state.drawManage.labelRemoveListener();
    patrolStore.patrolMode = false;
  }
};

// 切换巡逻模式
const switchPatroling = () => {
  if (patrolStore.patrolMode) {
    patrolStore.openPatrol(state.drawManage);
    subscribePlanTopic();
    notification.success({
      placement: "topRight",
      message: "开启巡逻模式",
      duration: 3,
    });
  } else {
    state.drawManage.exitPatrolMode();
  }
}

const confirmLabel = () => {
  console.log("confirm:", state.newLabelName);
  state.drawManage.addLabel(state.newLabelName);
  globalStore.closeLabelInput();
};

const cancelLabel = () => {
  console.log("cancel add label");
  globalStore.closeLabelInput();
};

const stopPatrol = () => {
  message.success('停止巡逻');
	patrolStore.stopPatrol();
}

onBeforeUnmount(() => {
  foxgloveClientStore.callService("/tiered_nav_state_machine/switch_mode", {
    mode: 0,
  });
  state.drawManage?.pzRemoveListener();
  state.drawManage?.navRemoveListener();
  state.drawManage.unSubscribeCarPosition();
  state.drawManage.unSubscribeScanPoints();
  state.drawManage.unAdvertiseNavTopic();

  patrolStore.patrolMode = false;
  patrolStore.exitPatrol();
});
</script>

<style lang="less" scoped>
.navigation {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;

  .view {
    flex-grow: 1;
    background: #fff;
    border: 10px solid #fff;
    .flex;
    overflow: hidden;

    .tips {
      font-size: 0.8em;
      color: #999;
      letter-spacing: 1px;
    }
  }

  .btn {
    width: 100%;
    margin-bottom: 10px;
    
    .btn-line {
      .flex;
      justify-content: initial;
      gap: 10px;
      min-height: 32px;
    }

    .switch {
      .flex;
      gap: 15px;
    }
  }

}

:deep(.Table) {
  &-header {
    font-size: 15px !important;
  }
}
</style>
