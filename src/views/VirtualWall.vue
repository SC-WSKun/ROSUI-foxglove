<template>
  <div class="virtualWall">
    <div class="view" id="virtualWallMap">
      <div class="tips" v-if="state.curState === 0">请先在右侧选择地图</div>
      <div id="mapImgWrap">
        <VirtualWallCom
          v-if="state.curState > 0"
          :drawManage="state.drawManage"
          :mapName="state.mapName"
        />
      </div>
    </div>
    <div class="config">
      <a-card
        title="操作栏"
        :bordered="false"
        style="width: 100%; height: 100%"
      >
        <!-- 0. 等待用户获取地图列表 -->
        <div class="btn" v-if="state.curState === 0">
          <a-button @click="selectMap" type="primary">选择地图</a-button>
        </div>
        <!-- 1. 地图选择完成 -->
        <div class="btn" v-if="state.curState === 1">
          <div style="width: 100%; display: flex; justify-content: space-around;">
            <a-button @click="changeMode" type="primary">
              切换{{ state.mode === Mode.DRAW ? '删除模式' : '绘制模式' }}
            </a-button>
          </div>
          <template v-if="state.mode === Mode.DRAW">
            <a-button @click="confirmVW" type="primary">确认</a-button>
            <a-button @click="revokeVW" type="default">撤销</a-button>
            <a-button @click="clearVW" type="primary" danger>清除</a-button>
          </template>
          <p v-else>点击虚拟墙交互点进行删除</p>
        </div>
      </a-card>
    </div>
    <a-modal
      v-model:open="state.openClearModel"
      title="Tip"
      @ok="handleClear"
      @cancel="state.openClearModel = false"
    >
      <p>是否清除本次绘制的所有虚拟墙？</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { useFoxgloveClientStore } from "@/stores/foxgloveClient";
import { useGlobalStore } from "@/stores/global";
import { onBeforeUnmount, reactive, watch } from "vue";
import { type GridMap, type Map } from "@/typings";
import type { TableOptions } from "@/typings/component";
import type { MessageData } from "@foxglove/ws-protocol";
import DrawManage from "@/utils/draw";
import { message } from "ant-design-vue";
import VirtualWallCom from "@/components/VirtualWallCom.vue";
import { Mode } from "@/utils/virtualWall";

interface State {
  maps: Map[];
  selectedMap: Map | null;
  mapSubId: number;
  drawManage: DrawManage;
  connecting: boolean;
  curState: number;
  mode: Mode;
  mapName: string;
  openClearModel: boolean;
}

const foxgloveClientStore = useFoxgloveClientStore();
const globalStore = useGlobalStore();

const state = reactive<State>({
  maps: [],
  selectedMap: null,
  mapSubId: -1,
  drawManage: new DrawManage(),
  connecting: false, // 连接地图ing
  curState: 0, // 当前状态step
  mode: 0, // 当前模式
  mapName: '', // 当前选择的map_name
  openClearModel: false,
});

const STATE_MAP = {
  WAITING: 0, // 等待获取地图
  SELECTED: 1, // 地图选择完成
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
        globalStore.setLoading(true, "加载地图中");

        foxgloveClientStore
          .callService("/tiered_nav_state_machine/get_grid_map", {
            info: record,
          })
          .then((res) => {
            state.drawManage.unSubscribeCarPosition();
            state.drawManage.unSubscribeScanPoints();
            unSubscribeMapTopic();
            const wrap = document.getElementById(
              "virtualWallMap",
            ) as HTMLElement;
            state.drawManage.drawGridMap(wrap, res.map, true);
            state.drawManage.createVirtualWall();
            state.mapName = record.map_name;
            state.drawManage.vwDrawer?.changeMode(state.mode);
            state.curState = STATE_MAP.SELECTED;
            globalStore.setLoading(false);
            globalStore.closeModal();
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
    const wrap = document.getElementById("virtualWallMap") as HTMLElement;
    state.drawManage.drawGridMap(wrap, parseData, true);
  }
};

// 选择地图
const selectMap = () => {
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

// 完成虚拟墙绘制
const confirmVW = () => {
  const result = state.drawManage.vwDrawer?.addVW();
  if (!result) return;
  state.drawManage.vwDrawer?.clear();
}

// 撤销上一步绘制
const revokeVW = () => {
  state.drawManage.vwDrawer?.revoke(true);
}

// 清除虚拟墙绘制
const clearVW = () => {
  state.openClearModel = true;
}

const handleClear = () => {
  state.openClearModel = false;
  state.drawManage.vwDrawer?.clear();
}

function changeMode() {
  if (state.mode === Mode.DRAW) state.mode = Mode.DELETE;
  else state.mode = Mode.DRAW;
  state.drawManage.vwDrawer?.changeMode(state.mode);
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
});
</script>

<style lang="less" scoped>
.virtualWall {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
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

  .config {
    width: 35%;
    height: 100%;
    background: #fff;
    overflow: auto;
    .flex(center, center, column);
    gap: 15px;

    .btn {
      width: 100%;
      .flex(center, center);
      gap: 10px;
      flex-wrap: wrap;
      .switch {
        .flex;
        gap: 5px;
      }
    }
  }
}

:deep(.Table) {
  &-header {
    font-size: 15px !important;
  }
}
</style>
