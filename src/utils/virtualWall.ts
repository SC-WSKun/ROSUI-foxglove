const MOUSE_LEFT_BUTTON = 0;

// 创建虚拟墙
export class VirtualWall {
  canvas: HTMLCanvasElement | null = null;
  isDrawing = false;
  x = 0;
  y = 0;

  create(parentNode: HTMLElement, width: number, height: number) {
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "patrol-wrap";
      this.canvas.innerHTML = "";
      parentNode.appendChild(this.canvas);
      this.handleDraw();
      return;
    }
    this.canvas.width = width;
    this.canvas.height = height;
  }
  
  handleDraw() {
    const ctx = this.canvas?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    
    this.canvas?.addEventListener('mousedown', (event) => {
      if (event.button !== MOUSE_LEFT_BUTTON) return;
      this.x = event.layerX;
      this.y = event.layerY;
      this.isDrawing = true;
    });

    this.canvas?.addEventListener('mousemove', (event) => {
      if (event.button !== MOUSE_LEFT_BUTTON) return;
      if (this.isDrawing) {
        this.drawLine(ctx, this.x, this.y, event.layerX, event.layerY);
        this.x = event.layerX;
        this.y = event.layerY;
      }
    });

    this.canvas?.addEventListener('mouseup', (event) => {
      if (event.button !== MOUSE_LEFT_BUTTON) return;
      if (this.isDrawing) {
        this.drawLine(ctx, this.x, this.y, event.layerX, event.layerY);
        this.x = 0;
        this.y = 0;
        this.isDrawing = false;
      }
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
}
