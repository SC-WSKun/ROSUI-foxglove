import * as pako from "pako";
const MOUSE_LEFT_BUTTON = 0;

// 创建虚拟墙
export class VirtualWall {
  canvas: HTMLCanvasElement | null = null;
  isDrawing = false;
  revokeHistory: Uint8Array[] = [];
  revokeDisable = false;
  x = 0;
  y = 0;

  create(parentNode: HTMLElement, width: number, height: number) {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "virtual-wall-canvas";
      this.canvas.innerHTML = "";
      parentNode.appendChild(this.canvas);
      this.handleDraw();
    }
    this.canvas.width = width;
    this.canvas.height = height;
  }

  handleDraw() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);

    this.canvas.addEventListener("mousedown", (event) => {
      if (!this.canvas || event.button !== MOUSE_LEFT_BUTTON) return;

      // 存储压缩数据
      const imageDate = ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      const compressed = pako.deflate(new Uint8Array(imageDate.data));
      this.revokeHistory.push(compressed);
      this.revokeDisable = false;

      this.x = event.layerX;
      this.y = event.layerY;
      this.isDrawing = true;
    });

    this.canvas?.addEventListener("mousemove", (event) => {
      if (event.button !== MOUSE_LEFT_BUTTON) return;
      if (this.isDrawing) {
        this.drawLine(ctx, this.x, this.y, event.layerX, event.layerY);
        this.x = event.layerX;
        this.y = event.layerY;
      }
    });

    this.canvas?.addEventListener("mouseup", (event) => {
      if (event.button !== MOUSE_LEFT_BUTTON) return;
      if (this.isDrawing) {
        this.drawLine(ctx, this.x, this.y, event.layerX, event.layerY);
        this.x = 0;
        this.y = 0;
        this.isDrawing = false;
      }
    });
  }

  drawLine(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) {
    ctx.beginPath();
    ctx.strokeStyle = "orange";
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
      const imgData = new ImageData(
        unit8ClampedArray,
        this.canvas.width,
        this.canvas.height
      );
      const ctx = this.canvas.getContext("2d");
      ctx?.putImageData(imgData, 0, 0);
    } catch (err) {
      console.error(err);
    }
    this.revokeDisable = this.revokeDisable || this.revokeHistory.length === 0;
  }

  clear() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
