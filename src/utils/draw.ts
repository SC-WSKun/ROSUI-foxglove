import type {
  GridMap,
  MapInfo,
  Quaternion,
  TopicListener,
  Transform,
} from "@/typings";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import { message, notification } from "ant-design-vue";
import arrowImage from "@/assets/arrow.png";
import { useFoxgloveClientStore } from "@/stores/foxgloveClient";
import type { MessageData } from "@foxglove/ws-protocol";
import _ from "lodash";
import dict from "@/dict";
import { useGlobalStore } from "@/stores/global";

export default class DrawManage {
  panzoomIns: PanzoomObject | null = null;
  imgWrap: HTMLElement | null = null;
  img: HTMLImageElement | null = null;
  arrow: HTMLImageElement | null = null;
  car: HTMLElement | null = null;
  pointsWrap: HTMLElement | null = null;
  labelWrap: HTMLElement | null = null;
  scanPoints: HTMLElement[] = [];
  addingNav: boolean = false;
  navTranslation: {
    x: number;
    y: number;
    z: number;
  } | null = null;
  navRotation: {
    x: number;
    y: number;
    z: number;
    w: number;
  } | null = null;
  mapInfo: MapInfo | null = null;
  scale: number = 1; // 地图缩放比例
  foxgloveClientStore: any = null;
  goalChannelId: number | undefined = undefined;
  goalSeq: number = 0; // 导航点发布序号
  tfSubId: number | undefined = undefined;
  tfStaticSubId: number | undefined = undefined;
  scanSubId: number | undefined = undefined;
  carPositionListener: TopicListener;
  scanPointsListener: TopicListener;
  scanPointsTime: number = 0;
  carPose: {
    x: number;
    y: number;
    yaw: number;
  } | null = null;
  carRenderLock: boolean = false;

  navDisabled: boolean = false;
  labelDisabled: boolean = false;
  laserFrame: string | null = null;

  globalStore: any = null;

  constructor() {
    this.foxgloveClientStore = useFoxgloveClientStore();
    this.globalStore = useGlobalStore();
    // 需要定义为箭头函数，避免this指向错误
    this.carPositionListener = _.throttle(
      ({ op, subscriptionId, timestamp, data }: MessageData) => {
        if (subscriptionId === this.tfSubId && !this.carRenderLock) {
          const parseData = this.foxgloveClientStore.readMsgWithSubId(
            subscriptionId,
            data
          );
          this.updateTransform(parseData?.transforms);
          this.globalStore.updateTransform(parseData?.transforms);
          this.carPose = mapToBaseFootprint(
            this.globalStore.getTransform("odomToMap"),
            this.globalStore.getTransform("baseFootprintToOdom")
          );
          this.updateCarPose();
        }
      },
      5
    );
    this.scanPointsListener = ({
      op,
      subscriptionId,
      timestamp,
      data,
    }: MessageData) => {
      if (subscriptionId === this.tfStaticSubId) {
        const parseData = this.foxgloveClientStore.readMsgWithSubId(
          subscriptionId,
          data
        );
        console.log("tfStatic", parseData);
        this.updateTransform(parseData.transforms);
        this.globalStore.updateTransform(parseData.transforms);
      } else if (subscriptionId === this.scanSubId) {
        const time = new Date().getTime();
        if (time - this.scanPointsTime < 1000) return;
        this.scanPointsTime = time;
        const parseData = this.foxgloveClientStore.readMsgWithSubId(
          subscriptionId,
          data
        );
        this.laserFrame = parseData.header.frame_id;
        let points = transformPointCloud(parseData);
        this.updateScanPoints(this.calPointPosition(points));
      }
    };
  }

  // 将后端返回的map通过canvas进行转化并展示成img
  drawGridMap(wrap: Element | null, data: GridMap, pz: boolean = false) {
    if (!wrap) {
      message.error("wrap not exist");
      throw new Error("wrap not exist");
    }
    const canvas = document.createElement("canvas");
    canvas.id = "map_canvas";
    this.mapInfo = data.info;

    canvas.width = this.mapInfo.width;
    canvas.height = this.mapInfo.height;

    // canvas绘制地图
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    for (let row = 0; row < canvas.height; row++) {
      for (let col = 0; col < canvas.width; col++) {
        const mapI = col + (canvas.height - 1 - row) * canvas.width;
        const val = data.data[mapI];
        const i = (col + row * canvas.width) * 4;

        imgData.data[i] = val === 100 ? 0 : val === 0 ? 236 : 127;
        imgData.data[i + 1] = val === 100 ? 0 : val === 0 ? 236 : 127;
        imgData.data[i + 2] = val === 100 ? 0 : val === 0 ? 236 : 127;
        imgData.data[i + 3] = 236;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    // img标签展示地图
    if (!this.img) this.img = new Image();
    // 确保地图能够等比例完全展示
    if (
      wrap?.clientWidth! / wrap?.clientHeight! >
      canvas.width / canvas.height
    ) {
      this.img.height = wrap?.clientHeight!;
      this.img.width = (wrap?.clientHeight! * canvas.width) / canvas.height;
    } else {
      this.img.width = wrap?.clientWidth!;
      this.img.height = (wrap?.clientWidth! * canvas.height) / canvas.width;
    }
    this.img.src = canvas.toDataURL("image/png");
    // 地图缩放比例
    this.scale = this.mapInfo.width / this.img.width;

    // imgWrap包含map和arrow
    if (!this.imgWrap) {
      this.imgWrap = document.createElement("div");
      this.imgWrap.style.position = "relative";
      wrap.appendChild(this.imgWrap);
    }
    this.img.style.position = "absolute";
    this.img.id = "map_img";
    this.imgWrap.style.height = `${this.img.height}px`;
    this.imgWrap.style.width = `${this.img.width}px`;

    let lastImg = document.querySelector("#map_img");
    if (lastImg) {
      this.imgWrap.replaceChild(this.img, lastImg);
      lastImg = null;
    } else {
      this.imgWrap.appendChild(this.img);
    }

    // 添加缩放和平移功能
    if (pz && !this.panzoomIns) {
      this.setPanzoom(this.imgWrap);
    }
  }

  async drawLabel() {
    if (!this.mapInfo || !this.imgWrap) return;
    if (!this.labelWrap) {
      this.labelWrap = document.createElement("div");
      this.labelWrap.className = "label-wrap";
    }
    this.labelWrap.innerHTML = "";
    this.imgWrap.appendChild(this.labelWrap);
    const { result, labels } = await this.foxgloveClientStore.callService(
      "/label_manager/get_labels"
    );
    if (result !== true) {
      message.error("获取标签失败");
      return;
    }
    console.log("get labels: ", labels);
    labels.forEach((label: { label_name: string; pose: any }) => {
      if (!this.mapInfo || !this.imgWrap) return;
      const element = document.createElement("div");
      element.className = "nav-label";
      const { x, y } = worldCoordinateToPixel(
        label.pose.position.x,
        label.pose.position.y,
        this.scale,
        this.mapInfo.resolution,
        this.mapInfo.origin.position.x,
        this.mapInfo.origin.position.y
      );
      element.innerHTML = label.label_name;
      element.style.left = `${x}px`;
      element.style.top = `${this.imgWrap.offsetHeight - y}px`;
      element.addEventListener("click", () => {
        console.log("click label:", label.label_name);
        this.removeLabel(label.label_name);
      });
      this.labelWrap?.appendChild(element);
    });
  }

  async removeLabel(label_name: string) {
    const { result } = await this.foxgloveClientStore.callService(
      "/label_manager/del_label",
      { label_name }
    );
    if (result !== true) {
      message.error("删除标签失败");
      return;
    } else {
      message.success("标签删除成功");
      this.drawLabel();
    }
  }

  // 为画布添加缩放和平移拖拽功能
  setPanzoom(imgWrap: HTMLElement) {
    this.panzoomIns = Panzoom(imgWrap, {
      // 限制缩放范围
      minScale: 0.8,
      maxScale: 3,
      cursor: "normal",
      noBind: true,
    });

    // 自定义监听拖拽事件
    this.pzAddListener();
  }

  // 重置画布状态
  resetPanzoom() {
    this.panzoomIns?.reset();
  }

  // 拖拽&缩放地图的鼠标事件监听
  handleMousedown: any = (event: PointerEvent) => {
    // 鼠标左键
    if (event.button === 0) {
      this.panzoomIns!.handleDown(event);
    }
  };

  handleMousemove: any = (event: PointerEvent) => {
    if (event.buttons === 1 && event.button === 0) {
      this.panzoomIns!.handleMove(event);
    }
  };

  handleMouseup: any = (event: PointerEvent) => {
    if (event.button === 0) {
      this.panzoomIns!.handleUp(event);
    }
  };

  handleMouseleave: any = (event: PointerEvent) => {
    if (event.button === 0) {
      this.panzoomIns!.handleUp(event);
    }
  };

  // 添加地图交互事件监听
  pzAddListener() {
    this.img?.addEventListener("mousedown", this.handleMousedown);
    this.img?.addEventListener("mousemove", this.handleMousemove);
    this.img?.addEventListener("mouseup", this.handleMouseup);
    this.img?.addEventListener("mouseleave", this.handleMouseleave);
    this.img?.addEventListener("wheel", this.panzoomIns!.zoomWithWheel);
    if (this.labelWrap) this.labelWrap.style.pointerEvents = "none";
  }

  // 移除地图交互事件监听
  pzRemoveListener() {
    if (!this.panzoomIns) return;
    this.img?.removeEventListener("mousedown", this.handleMousedown);
    this.img?.removeEventListener("mousemove", this.handleMousemove);
    this.img?.removeEventListener("mouseup", this.handleMouseup);
    this.img?.removeEventListener("mouseleave", this.handleMouseleave);
    this.img?.removeEventListener("wheel", this.panzoomIns!.zoomWithWheel);
    if(this.labelWrap) this.labelWrap.style.pointerEvents = "auto";
    this.labelWrap?.removeEventListener("mousedown", this.handleMousedown);
    this.labelWrap?.removeEventListener("mouseup", this.handleMouseup);
  }

  // 添加导航箭头的鼠标事件监听
  navHandleMousedown: any = (event: PointerEvent) => {
    event.preventDefault();
    this.addingNav = true;
    this.arrow = document.createElement("img") as HTMLImageElement;
    this.arrow.className = "arrow";
    this.arrow.src = arrowImage;
    if (!this.arrow) return;
    this.arrow.style.left = `${event.offsetX}px`;
    this.arrow.style.top = `${event.offsetY}px`;
    if (!this.mapInfo) {
      message.error("map_info not found!");
      return;
    }
    // 获取真实世界坐标
    console.log("mapInfo:", this.mapInfo);

    const { x, y } = pixelToWorldCoordinate(
      event.offsetX,
      event.offsetY,
      this.scale,
      this.mapInfo.resolution,
      this.mapInfo.origin.position.x,
      this.mapInfo.origin.position.y,
      this.mapInfo.height
    );
    console.log(x, y, this.scale);

    this.navTranslation = {
      x,
      y,
      z: 0,
    };

    const prevArrow = this.imgWrap?.querySelector(".arrow");
    if (prevArrow) {
      this.imgWrap?.removeChild(prevArrow);
    }
    this.imgWrap?.appendChild(this.arrow);
  };

  navHandleMousemove: any = (event: PointerEvent) => {
    if (this.addingNav && this.arrow) {
      const deltaX = event.offsetX - parseInt(this.arrow.style.left);
      const deltaY = event.offsetY - parseInt(this.arrow.style.top);
      let length = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));
      length = length > 1 ? length : 1;
      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
      this.arrow.style.transform = `translate(-50%, -100%) rotate(${
        angle + 90
      }deg) scaleY(${length / 1}) scaleX(${length / 4})`;
    }
  };

  navHandleMouseup: any = (event: PointerEvent) => {
    this.addingNav = false;
    if (!this.mapInfo) {
      message.error("map_info is not found");
      return;
    }
    // 计算鼠标松开位置的真实世界坐标，同像素坐标 -> 栅格坐标 -> 真实世界坐标
    const { x, y } = pixelToWorldCoordinate(
      event.offsetX,
      event.offsetY,
      this.scale,
      this.mapInfo.resolution,
      this.mapInfo.origin.position.x,
      this.mapInfo.origin.position.y,
      this.mapInfo.height
    );
    if (!this.navTranslation) {
      console.log("navTranslation is not found");
      return;
    }
    this.navRotation = coordinatesToQuaternion(
      this.navTranslation.x,
      this.navTranslation.y,
      x,
      y
    );
    // 处于导航模式
    if (this.goalChannelId !== undefined && !this.navDisabled) {
      this.publishNavigation();
    }

    // 隐藏箭头
    this.removeArrow();
    // this.imgWrap?.removeChild(this.arrow!)
    // console.log('rotation', this.navRotation)
  };

  // 添加导航点交互监听
  navAddListener() {
    this.pzRemoveListener();
    this.img?.addEventListener("mousedown", this.navHandleMousedown);
    this.img?.addEventListener("mousemove", this.navHandleMousemove);
    this.img?.addEventListener("mouseup", this.navHandleMouseup);
  }

  // 移除导航点交互监听
  navRemoveListener() {
    this.img?.removeEventListener("mousedown", this.navHandleMousedown);
    this.img?.removeEventListener("mousemove", this.navHandleMousemove);
    this.img?.removeEventListener("mouseup", this.navHandleMouseup);
  }

  // 启动导航
  advertiseNavTopic() {
    // if (this.panzoomIns) this.pzRemoveListener()
    // this.navAddListener()
    if (this.goalChannelId !== undefined) return;
    this.goalChannelId = this.foxgloveClientStore.advertiseTopic({
      encoding: "cdr",
      schema:
        "# A Pose with reference coordinate frame and timestamp\n\nstd_msgs/Header header\nPose pose\n\n================================================================================\nMSG: geometry_msgs/Pose\n# A representation of pose in free space, composed of position and orientation.\n\nPoint position\nQuaternion orientation\n\n================================================================================\nMSG: geometry_msgs/Point\n# This contains the position of a point in free space\nfloat64 x\nfloat64 y\nfloat64 z\n\n================================================================================\nMSG: geometry_msgs/Quaternion\n# This represents an orientation in free space in quaternion form.\n\nfloat64 x 0\nfloat64 y 0\nfloat64 z 0\nfloat64 w 1\n\n================================================================================\nMSG: std_msgs/Header\n# Standard metadata for higher-level stamped data types.\n# This is generally used to communicate timestamped data\n# in a particular coordinate frame.\n\n# Two-integer timestamp that is expressed as seconds and nanoseconds.\nbuiltin_interfaces/Time stamp\n\n# Transform frame with which this data is associated.\nstring frame_id\n\n================================================================================\nMSG: builtin_interfaces/Time\n# This message communicates ROS Time defined here:\n# https://design.ros2.org/articles/clock_and_time.html\n\n# The seconds component, valid over all int32 values.\nint32 sec\n\n# The nanoseconds component, valid in the range [0, 1e9).\nuint32 nanosec\n",
      schemaEncoding: "ros2msg",
      schemaName: "geometry_msgs/msg/PoseStamped",
      topic: "/goal_pose",
    });
    message.success("导航模式已启动");
  }

  // 关闭导航
  unAdvertiseNavTopic() {
    if (this.goalChannelId === undefined) return;
    this.foxgloveClientStore.unAdvertiseTopic(this.goalChannelId);
    this.goalChannelId = undefined;
    message.warning("导航模式已关闭");
  }

  // 清除图中残留箭头
  removeArrow() {
    if (this.arrow) this.imgWrap && this.imgWrap.removeChild(this.arrow);
  }

  // 监听小车位置信息
  subscribeCarPosition() {
    this.foxgloveClientStore
      .subscribeTopic("/tf")
      .then((res: number) => (this.tfSubId = res));
    this.foxgloveClientStore.listenMessage(this.carPositionListener);
  }

  // 停止监听小车位置信息
  unSubscribeCarPosition() {
    this.foxgloveClientStore.stopListenMessage(this.carPositionListener);
    this.foxgloveClientStore.unSubscribeTopic(this.tfSubId);
    // 清除小车
    if (this.car) {
      this.imgWrap && this.imgWrap.removeChild(this.car as HTMLElement);
      this.car = null;
    }
  }

  // 监听扫描红点
  subscribeScanPoints() {
    this.foxgloveClientStore.subscribeTopic("/scan").then((res: number) => {
      this.scanSubId = res;
    });
    this.foxgloveClientStore
      .subscribeTopic("/tf_static")
      .then((res: number) => (this.tfStaticSubId = res));
    this.foxgloveClientStore.listenMessage(this.scanPointsListener);
  }

  // 停止监听扫描红点
  unSubscribeScanPoints() {
    this.foxgloveClientStore.stopListenMessage(this.scanPointsListener);
    this.foxgloveClientStore.unSubscribeTopic(this.scanSubId);
    if (this.pointsWrap) this.pointsWrap.innerHTML = "";
  }

  // 在地图上更新小车位置
  updateCarPose() {
    if (!this.carPose || !this.mapInfo || !this.imgWrap) return;
    if (!this.car) {
      this.car = document.createElement("div");
      this.car.className = "car";
    }
    const { x, y } = worldCoordinateToPixel(
      this.carPose.x,
      this.carPose.y,
      this.scale,
      this.mapInfo.resolution,
      this.mapInfo.origin.position.x,
      this.mapInfo.origin.position.y
    );
    this.car.style.left = `${x}px`;
    this.car.style.top = `${this.imgWrap.offsetHeight - y}px`;
    this.car.style.transform = `rotate(${-this.carPose.yaw}deg)`;
    this.imgWrap?.appendChild(this.car);
  }

  // 在地图上更新扫描红点
  updateScanPoints(points: { x: number; y: number }[] | null) {
    if (!this.imgWrap || !this.mapInfo || !points) return;
    if (!this.pointsWrap) {
      this.pointsWrap = document.createElement("div");
      this.pointsWrap.className = "points-wrap";
    }
    this.imgWrap.appendChild(this.pointsWrap);
    // 清除之前的红点
    this.pointsWrap.innerHTML = "";
    points.forEach((point: { x: number; y: number } | null) => {
      // 过滤无用point，transform未获取全时point坐标会被转换为null
      if (!point) return;
      const pointEl = document.createElement("div");
      pointEl.className = "point";
      const { x, y } = worldCoordinateToPixel(
        point.x,
        point.y,
        this.scale,
        this.mapInfo!.resolution,
        this.mapInfo!.origin.position.x,
        this.mapInfo!.origin.position.y
      );
      pointEl.style.left = `${x}px`;
      pointEl.style.top = `${this.imgWrap!.offsetHeight - y}px`;
      this.pointsWrap!.appendChild(pointEl);
    });
  }

  // 发布导航信息
  publishNavigation(frame_id: string = "map") {
    this.foxgloveClientStore.publishMessage(this.goalChannelId, {
      header: {
        seq: this.goalSeq++,
        stamp: {
          secs: Math.floor(Date.now() / 1000),
          nsecs: (Date.now() / 1000) * 1000000,
        },
        frame_id,
      },
      pose: {
        position: this.navTranslation,
        orientation: this.navRotation,
      },
    });
  }

  // 更新transform
  updateTransform(
    transforms: {
      transform: Transform;
      child_frame_id: string;
      [key: string]: any;
    }[]
  ) {
    transforms?.forEach((transform) => {
      const { transform_map } = dict;
      _.set(
        this,
        _.get(transform_map, transform.child_frame_id),
        transform.transform
      );
    });
  }

  // 根据frame_id转换坐标
  getPositionWithFrame(position: { x: number; y: number }) {
    if (!this.laserFrame) return null;
    let tmp: any = position;
    const { transform_map } = dict;

    tmp = applyTransform(
      position,
      // _.get(this, _.get(transform_map, this.laserFrame))
      this.globalStore.getTransform(_.get(transform_map, this.laserFrame))
    );
    if (!tmp) return null;
    tmp = applyTransform(
      tmp,
      this.globalStore.getTransform("baseLinkToBaseFootprint")
    );
    tmp = applyTransform(
      tmp,
      this.globalStore.getTransform("baseFootprintToOdom")
    );
    tmp = applyTransform(tmp, this.globalStore.getTransform("odomToMap"));
    return tmp;
  }

  // 计算点云数据坐标
  calPointPosition(points: { x: number; y: number }[]) {
    if (!this.laserFrame) return null;
    return points.map((point) => {
      return this.getPositionWithFrame(point);
    });
  }

  // 清空画布
  clear() {
    this.imgWrap?.remove();
    this.imgWrap = null;
    this.pzRemoveListener();
    this.panzoomIns = null;
  }

  // 添加标签交互监听
  labelAddListener() {
    console.log("add label method listener");
    this.pzRemoveListener();
    this.drawLabel();
    this.labelWrap?.addEventListener("mousedown", this.labelHandleMousedown);
    this.labelWrap?.addEventListener("mouseup", this.labelHandleMouseup);
  }

  // 移除标签交互监听
  labelRemoveListener() {
    this.labelWrap?.addEventListener("mousedown", this.labelHandleMousedown);
    this.labelWrap?.removeEventListener("mouseup", this.labelHandleMouseup);
    if (this.labelWrap) this.labelWrap.innerHTML = "";
  }

  // 添加导航箭头的鼠标事件监听
  labelHandleMousedown: any = (event: PointerEvent) => {
    event.preventDefault();
    this.addingNav = true;
    this.arrow = document.createElement("img") as HTMLImageElement;
    this.arrow.className = "arrow";
    this.arrow.src = arrowImage;
    if (!this.arrow) return;
    this.arrow.style.left = `${event.offsetX}px`;
    this.arrow.style.top = `${event.offsetY}px`;
    if (!this.mapInfo) {
      message.error("map_info not found!");
      return;
    }
    // 获取真实世界坐标
    console.log("mapInfo:", this.mapInfo);

    const { x, y } = pixelToWorldCoordinate(
      event.offsetX,
      event.offsetY,
      this.scale,
      this.mapInfo.resolution,
      this.mapInfo.origin.position.x,
      this.mapInfo.origin.position.y,
      this.mapInfo.height
    );
    console.log(x, y, this.scale);

    this.navTranslation = {
      x,
      y,
      z: 0,
    };

    const prevArrow = this.imgWrap?.querySelector(".arrow");
    if (prevArrow) {
      this.imgWrap?.removeChild(prevArrow);
    }
    this.imgWrap?.appendChild(this.arrow);
  };

  /** 触发标点事件
   * @param event 点击事件
   */
  labelHandleMouseup: any = (event: PointerEvent) => {
    if (!this.mapInfo) {
      message.error("map_info is not found");
      return;
    }
    // 计算鼠标松开位置的真实世界坐标，同像素坐标 -> 栅格坐标 -> 真实世界坐标
    const { x, y } = pixelToWorldCoordinate(
      event.offsetX,
      event.offsetY,
      this.scale,
      this.mapInfo.resolution,
      this.mapInfo.origin.position.x,
      this.mapInfo.origin.position.y,
      this.mapInfo.height
    );
    if (!this.navTranslation) {
      console.log("navTranslation is not found");
      return;
    }
    this.navRotation = coordinatesToQuaternion(
      this.navTranslation.x,
      this.navTranslation.y,
      x,
      y
    );

    if (!this.labelDisabled) {
      this.globalStore.switchLabelInput();
      // this.addLabel("test1");
    }
  };
  // 添加标点
  async addLabel(label_name: string) {
    if (!this.navTranslation) {
      console.error("navTranslation not found");
      return;
    }
    console.log(`add label name: ${label_name}`)
    console.log(
      `add label x: ${this.navTranslation?.x}, y: ${this.navTranslation?.y}`
    );
    label_name = new TextEncoder().encode(label_name).toString();
    const { result } = await this.foxgloveClientStore?.callService(
      "/label_manager/add_label",
      {
        label_name,
        pose: {
          position: {
            x: this.navTranslation?.x,
            y: this.navTranslation?.y,
            z: 0,
          },
        },
      }
    );
    if (result === true) {
      message.success("添加标签成功");
      this.drawLabel();
    } else {
      message.error("添加标签失败");
    }
  }
}

// 像素坐标转真实世界坐标
const pixelToWorldCoordinate = (
  pixelOffsetX: number,
  pixelOffsetY: number,
  scale: number,
  resolution: number,
  originX: number,
  originY: number,
  gridHeight: number
): { x: number; y: number } => {
  return {
    x: pixelOffsetX * scale * resolution + originX,
    y: (gridHeight - pixelOffsetY * scale) * resolution + originY,
  };
};

// 真实世界坐标转像素坐标
const worldCoordinateToPixel = (
  worldX: number,
  worldY: number,
  scale: number,
  resolution: number,
  originX: number,
  originY: number
): { x: number; y: number } => {
  return {
    x: (worldX - originX) / (scale * resolution),
    y: (worldY - originY) / (scale * resolution),
  };
};

// 起始坐标计算旋转四元数（二维平面）
const coordinatesToQuaternion = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Quaternion => {
  // 计算向量
  const dx = endX - startX;
  const dy = endY - startY;
  // 计算旋转角度（弧度）
  const angle = Math.atan2(dy, dx);
  console.log((angle / Math.PI) * 180);

  // 计算四元数
  const w = Math.cos(angle / 2);
  const z = Math.sin(angle / 2);
  return {
    w,
    x: 0,
    y: 0,
    z,
  };
};

// 计算机器人相对于map的位置
// map -> odom -> base_footprint
const mapToBaseFootprint = (
  odomToMap: Transform | null,
  baseFootprintToOdom: Transform | null
) => {
  if (!odomToMap || !baseFootprintToOdom) {
    return null;
  }
  // 计算map到odom的偏航角
  const mapToOdomYaw = Math.atan2(
    2.0 *
      (odomToMap.rotation.x * odomToMap.rotation.y +
        odomToMap.rotation.z * odomToMap.rotation.w),
    1.0 -
      2.0 *
        (odomToMap.rotation.y * odomToMap.rotation.y +
          odomToMap.rotation.z * odomToMap.rotation.z)
  );
  // 计算odom到base_footprint的偏航角
  const odomToBaseYaw = Math.atan2(
    2.0 *
      (baseFootprintToOdom.rotation.x * baseFootprintToOdom.rotation.y +
        baseFootprintToOdom.rotation.z * baseFootprintToOdom.rotation.w),
    1.0 -
      2.0 *
        (baseFootprintToOdom.rotation.y * baseFootprintToOdom.rotation.y +
          baseFootprintToOdom.rotation.z * baseFootprintToOdom.rotation.z)
  );
  // 计算map到odom的旋转矩阵
  const cosMapToOdom = Math.cos(mapToOdomYaw);
  const sinMapToOdom = Math.sin(mapToOdomYaw);
  // 将odomToBaseFootprint的平移向量通过mapToOdom的旋转进行旋转
  const rotatedOdomToBaseX =
    baseFootprintToOdom.translation.x * cosMapToOdom -
    baseFootprintToOdom.translation.y * sinMapToOdom;
  const rotatedOdomToBaseY =
    baseFootprintToOdom.translation.x * sinMapToOdom +
    baseFootprintToOdom.translation.y * cosMapToOdom;
  // 将旋转后的平移向量加到mapToOdom的平移向量上
  const finalTranslationX = odomToMap.translation.x + rotatedOdomToBaseX;
  const finalTranslationY = odomToMap.translation.y + rotatedOdomToBaseY;
  // 对于旋转，直接将两个偏航角相加
  const finalYaw = (mapToOdomYaw + odomToBaseYaw) * (180 / Math.PI);

  return {
    x: finalTranslationX,
    y: finalTranslationY,
    yaw: finalYaw,
  };
};

// 转换点云数据
const transformPointCloud = (pointCloud: any) => {
  const points = [];
  let angle = pointCloud.angle_min;
  const min = pointCloud.range_min;
  const max = pointCloud.range_max;
  for (let i = 0; i < pointCloud.ranges.length; i++) {
    const range = pointCloud.ranges[i];
    if (range <= max && range >= min) {
      points.push({
        x: range * Math.cos(angle),
        y: range * Math.sin(angle),
      });
    }
    angle += pointCloud.angle_increment;
  }
  return points;
};

// 点云应用坐标系转换
const applyTransform = (
  points: { x: number; y: number }[] | { x: number; y: number },
  transform: Transform | null
) => {
  if (!transform || !points) return null;
  const { rotation, translation } = transform;
  if (points instanceof Array) {
    return points.map((point) => {
      const yaw = Math.atan2(
        2.0 * (rotation.w * rotation.z + rotation.x * rotation.y),
        1.0 - 2.0 * (rotation.y * rotation.y + rotation.z * rotation.z)
      );
      const rotatedX = Math.cos(yaw) * point.x - Math.sin(yaw) * point.y;
      const rotatedY = Math.sin(yaw) * point.x + Math.cos(yaw) * point.y;
      return {
        x: rotatedX + translation.x,
        y: rotatedY + translation.y,
      };
    });
  } else {
    const yaw = Math.atan2(
      2.0 * (rotation.w * rotation.z + rotation.x * rotation.y),
      1.0 - 2.0 * (rotation.y * rotation.y + rotation.z * rotation.z)
    );
    const rotatedX = Math.cos(yaw) * points.x - Math.sin(yaw) * points.y;
    const rotatedY = Math.sin(yaw) * points.x + Math.cos(yaw) * points.y;
    return {
      x: rotatedX + translation.x,
      y: rotatedY + translation.y,
    };
  }
};
