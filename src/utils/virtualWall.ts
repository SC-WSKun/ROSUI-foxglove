// @ts-nocheck
import * as pako from "pako";
import { useVirtualWallStore, useVirtualWallStoreRef, type ILine, type IVirtualWall } from "@/stores/virtualWall";
import { worldCoordinateToPixel, pixelToWorldCoordinate } from "./draw";
import type { MapInfo } from "@/typings";
import { message } from "ant-design-vue";

const MOUSE_LEFT_BUTTON = 0;
const virtualWallStore = useVirtualWallStore();

const zIndex = 11;

export enum Mode {
  DRAW = 0,
  DELETE = 1,
}

// 创建虚拟墙
export class VirtualWall {
  imgWrap: HTMLElement | null = null;
  canvas: HTMLCanvasElement | null = null;
  interactivePointWrap: HTMLElement | null = null;
  isDrawing = false;
  lines: ILine[] = [];
  revokeHistory: Uint8Array[] = [];
  // moudeDown位置
  startX = 0;
  startY = 0;
  scale:number = 1;
  mapInfo: MapInfo | null = null;

  create(imgWrap: HTMLElement, width: number, height: number, mapInfo: MapInfo, scale: number) {
    if (!imgWrap) return;
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "virtual-wall-canvas";
      this.canvas.innerHTML = "";
      imgWrap.appendChild(this.canvas);
      this.imgWrap = imgWrap;
      this.handleDraw();
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.scale = scale;
    this.mapInfo = mapInfo;

    // 虚拟墙交互点
    this.drawInteractivePoint(mapInfo, scale);
  }

  handleDraw() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);

    this.canvas.addEventListener("mousedown", (event: any) => {
      if (!this.canvas || event.button !== MOUSE_LEFT_BUTTON) return;

      // 存储压缩数据
      this.save();

      this.startX = event.layerX;
      this.startY = event.layerY;
      this.isDrawing = true;
    });

    this.canvas?.addEventListener('mousemove', (event: any) => {
      if (event.button !== MOUSE_LEFT_BUTTON || !this.isDrawing || !this.canvas) return;

      // 避免绘制中鼠标移出canvas界限导致绘制异常
      if (event.layerX < 5 || event.layerX >= this.canvas.width - 5
        || event.layerY < 5 || event.layerY >= this.canvas.height - 5
      ) return this.isDrawing = false;
      
      this.drawLine(ctx, this.startX, this.startY, event.layerX, event.layerY);
    });
  }

  drawLine(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) {
    this.revoke({popHistory: false});
    ctx.beginPath();
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 5;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  revoke({popLine = false, popHistory = true}: {popLine?: boolean, popHistory?: boolean}) {
    if (this.revokeHistory.length === 0 || !this.canvas) return;
    const compressed = popHistory ? this.revokeHistory.pop()! : this.revokeHistory.at(-1);
    try {
      const decompressed = pako.inflate(compressed);
      const unit8ClampedArray = new Uint8ClampedArray(decompressed);
      const imgData = new ImageData(
        unit8ClampedArray,
        this.canvas.width,
        this.canvas.height
      );
      const ctx = this.canvas.getContext("2d");
      ctx?.putImageData(imgData, 0, 0);
      if (popLine) this.lines.pop();
    } catch (err) {
      console.error(err);
    }
  }

  save() {
    const ctx = this.canvas!.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, this.canvas!.width, this.canvas!.height);
    const compressed = pako.deflate(new Uint8Array(imageData.data));
    this.revokeHistory.push(compressed);
  }

  clear() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.revokeHistory = [];
    this.lines = [];
  }

  drawInteractivePoint(mapInfo: MapInfo | null, scale: number) {
    if (!this.imgWrap) return;
    if (!this.interactivePointWrap) {
      this.interactivePointWrap = document.createElement('div');
      this.interactivePointWrap.className = "interactive-point-wrap";
      this.imgWrap.appendChild(this.interactivePointWrap);
    }
    this.interactivePointWrap.innerHTML = "";
    virtualWallStore.virtualWalls.forEach((wall: IVirtualWall) => {
      if (!mapInfo) return;
      let { x: x0, y: y0 } = worldCoordinateToPixel(
        wall.x0,
        wall.y0,
        scale,
        mapInfo.resolution,
        mapInfo.origin.position.x,
        mapInfo.origin.position.y,
      );
      let { x: x1, y: y1 } = worldCoordinateToPixel(
        wall.x1,
        wall.y1,
        scale,
        mapInfo.resolution,
        mapInfo.origin.position.x,
        mapInfo.origin.position.y,
      );
      y0 = this.imgWrap?.offsetHeight - y0;
      y1 = this.imgWrap?.offsetHeight - y1;
      const el = document.createElement('div');
      el.className = 'interactive-point';
      el.style.position = 'absolute';
      el.style.top = `${(y0 + y1) / 2}px`;
      el.style.left = `${(x0 + x1) / 2}px`;
      el.addEventListener('click', async () => {
        console.log('interactive-point click');
        const result = await virtualWallStore.delVW(wall.wall_id);
        if (!result) return message.error("删除虚拟墙失败");
        this.interactivePointWrap?.removeChild(el);
      });
      this.interactivePointWrap?.appendChild(el);
    });
  }

  changeMode(mode: Mode) {
    if (!this.canvas || !this.interactivePointWrap) return;
    if (mode === Mode.DRAW) {
      this.canvas.style.zIndex = `${zIndex + 1}`;
      this.interactivePointWrap.style.display = "none";
      this.interactivePointWrap.style.zIndex = zIndex;
    } else {
      this.canvas.style.zIndex = zIndex;
      this.interactivePointWrap.style.display = "block";
      this.interactivePointWrap.style.zIndex = `${zIndex + 1}`;
    }
  }

  async addVW() {
    if (!this.mapInfo) return;
    const walls = this.lines.map(line => {
      const { x: x0, y: y0 } = pixelToWorldCoordinate(
        line.x0,
        line.y0,
        this.scale,
        this.mapInfo.resolution,
        this.mapInfo.origin.position.x,
        this.mapInfo.origin.position.y,
        this.mapInfo.height
      );
      const { x: x1, y: y1 } = pixelToWorldCoordinate(
        line.x1,
        line.y1,
        this.scale,
        this.mapInfo.resolution,
        this.mapInfo.origin.position.x,
        this.mapInfo.origin.position.y,
        this.mapInfo.height
      );
      return {x0, x1, y0, y1};
    });
    const { result, wallIds } = await virtualWallStore.addVW(walls);
    if (!result) message.error('添加虚拟墙失败');
    else message.success('添加成功');
    return result;
  }
}
