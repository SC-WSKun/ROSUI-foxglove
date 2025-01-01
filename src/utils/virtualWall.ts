// @ts-nocheck
import * as pako from "pako";
import { useVirtualWallStore, type ILine, type IVirtualWall } from "@/stores/virtualWall";
import { worldCoordinateToPixel } from "./draw";
import type { MapInfo } from "@/typings";
import { message } from "ant-design-vue";

const MOUSE_LEFT_BUTTON = 0;
const virtualWallStore = useVirtualWallStore();

const zIndex = '11';

export enum Mode {
  DRAW = 0,
  DELETE = 1,
}

// 创建虚拟墙
export class VirtualWall {
  parentNode: HTMLElement | null = null;
  canvas: HTMLCanvasElement | null = null;
  interactivePointWrap: HTMLElement | null = null;
  isDrawing = false;
  revokeHistory: Uint8Array<ArrayBufferLike>[] = [];
  lines: ILine[] = [];
  x = 0;
  y = 0;
  // moudeDown位置
  startX = 0;
  startY = 0;

  create(parentNode: HTMLElement, width: number, height: number, mapInfo: MapInfo, scale: number) {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "virtual-wall-canvas";
      this.canvas.innerHTML = "";
      parentNode.appendChild(this.canvas);
      this.parentNode = parentNode;
      this.handleDraw();
    }
    this.canvas.width = width;
    this.canvas.height = height;

    // 虚拟墙交互点
    this.drawInteractivePoint(mapInfo, scale);
  }

  handleDraw() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);

    this.canvas.addEventListener('mousedown', (event) => {
      if (!this.canvas || event.button !== MOUSE_LEFT_BUTTON) return;

      // 存储压缩数据
      this.save();

      this.x = event.layerX;
      this.y = event.layerY;
      this.startX = event.layerX;
      this.startY = event.layerY;
      this.isDrawing = true;
    });

    this.canvas?.addEventListener('mousemove', (event) => {
      if (event.button !== MOUSE_LEFT_BUTTON || !this.isDrawing || !this.canvas) return;

      // 避免绘制中鼠标移出canvas界限导致绘制异常
      if (event.layerX < 5 || event.layerX >= this.canvas.width - 5
        || event.layerY < 5 || event.layerY >= this.canvas.height - 5
      ) return this.endDraw(event);

      this.drawLine(ctx, this.x, this.y, event.layerX, event.layerY);
      this.x = event.layerX;
      this.y = event.layerY;
    });

    this.canvas?.addEventListener('mouseup', (event) => {
      if (event.button !== MOUSE_LEFT_BUTTON || !this.isDrawing) return;
      this.endDraw(event);
    });
  }

  drawLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    ctx.beginPath();
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  revoke() {
    if (this.revokeHistory.length === 0 || !this.canvas) return;
    const compressed = this.revokeHistory.pop()!;
    try {
      const decompressed = pako.inflate(compressed);
      const unit8ClampedArray = new Uint8ClampedArray(decompressed);
      const imgData = new ImageData(unit8ClampedArray, this.canvas.width, this.canvas.height);
      const ctx = this.canvas.getContext('2d');
      ctx?.putImageData(imgData, 0, 0);
      this.lines.pop();
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

  endDraw(event: MouseEvent) {
    const ctx = this.canvas!.getContext('2d')!;
    this.drawLine(ctx, this.x, this.y, event.layerX, event.layerY);
    this.x = 0;
    this.y = 0;
    this.isDrawing = false;

    // 曲线变直线
    this.revoke();
    this.save();
    this.drawLine(ctx, this.startX, this.startY, event.layerX, event.layerY);
    this.lines.push({
      x0: this.startX,
      y0: this.startY,
      x1: event.layerX,
      y1: event.layerY,
    });
  }

  clear() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.revokeHistory = [];
    this.lines = [];
  }

  drawInteractivePoint(mapInfo: MapInfo, scale: number) {
    if (!this.parentNode) return;
    if (!this.interactivePointWrap) {
      this.interactivePointWrap = document.createElement('div');
      this.interactivePointWrap.className = "interactive-point-wrap";
      this.interactivePointWrap.innerHTML = "";
      this.parentNode.appendChild(this.interactivePointWrap);
    }
    virtualWallStore.virtualWalls.forEach((wall: IVirtualWall) => {
      if (!mapInfo) return;
      const { x: x0, y: y0 } = worldCoordinateToPixel(
        wall.x0,
        wall.y0,
        scale,
        mapInfo.resolution,
        mapInfo.origin.position.x,
        mapInfo.origin.position.y,
      );
      const { x: x1, y: y1 } = worldCoordinateToPixel(
        wall.x1,
        wall.y1,
        scale,
        mapInfo.resolution,
        mapInfo.origin.position.x,
        mapInfo.origin.position.y,
      );
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.top = `${(y0 + y1) / 2}px`;
      el.style.left = `${(x0 + x1) / 2}px`;
      el.addEventListener('click', async () => {
        const result = await virtualWallStore.delVW(wall.wall_id);
        if (!result) return message.error("删除虚拟墙失败");
        this.interactivePointWrap?.removeChild(el);
      });
      this.interactivePointWrap?.appendChild(el);
    });
  }

  changeMode(mode: Mode) {
    if (!this.canvas || !this.interactivePointWrap) return;
    if (mode = Mode.DRAW) {
      this.canvas.style.zIndex = zIndex + 1;
      this.interactivePointWrap.style.zIndex = zIndex;
    } else {
      this.canvas.style.zIndex = zIndex;
      this.interactivePointWrap.style.zIndex = zIndex + 1;
    }
  }

  async addVW() {
    console.log('addVW params', this.lines);
    const { result, wallIds } = await virtualWallStore.addVW(this.lines);
    if (!result) message.error('添加虚拟墙失败');
    console.log('addVW res', result, wallIds);
  }
}
