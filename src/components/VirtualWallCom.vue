<template>
  <div id="vwContainer"></div>
</template>

<script setup lang="ts">
import { useVirtualWallStore } from '@/stores/virtualWall';
import type { IVirtualWall } from '@/stores/virtualWall';
import { worldCoordinateToPixel } from '@/utils/draw';
import DrawManage from '@/utils/draw';
import { onMounted, watch } from 'vue';

// 此组件单纯用于导航地图展示虚拟墙
// 虚拟墙绘制、删除操作在view/VirtualWall

const {
  drawManage,
  isWatching
} = defineProps<{
	drawManage: DrawManage,
  isWatching: boolean,
}>();

const virtualWallStore = useVirtualWallStore();
let vwContainer = document.getElementById('vwContainer');
let canvas: HTMLCanvasElement | null = null;

onMounted(() => {
  // 编辑态不更新
  // if (!drawManage.img || canvas && !isWatching) return;
  virtualWallStore.getVWs();
  drawVWs(drawManage.img!.width, drawManage.img!.height);
})

watch(
  () => virtualWallStore.virtualWalls,
  () => {
    // 非编辑态不更新
    if (isWatching) return;
    virtualWallStore.getVWs();
    drawVWs(drawManage.img!.width, drawManage.img!.height);
  }
)

function drawVWs(canvasWidth: number, canvasHeight: number) {
  if (!drawManage) return;
  if (!vwContainer) vwContainer = document.getElementById('vwContainer');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = "virtual-wall-canvas";
    canvas.innerHTML = "";
    vwContainer!.appendChild(canvas);
  }
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 1000, 1000);
  ctx.beginPath();
  console.log('drawVWs--------------------', virtualWallStore.virtualWalls);
  virtualWallStore.virtualWalls.forEach((wall: IVirtualWall) => {
    if (!drawManage?.mapInfo) return;
    const { x: x0, y: y0 } = worldCoordinateToPixel(
      wall.x0,
      wall.y0,
      drawManage.scale,
      drawManage.mapInfo.resolution,
      drawManage.mapInfo.origin.position.x,
      drawManage.mapInfo.origin.position.y,
    );
    const { x: x1, y: y1 } = worldCoordinateToPixel(
      wall.x1,
      wall.y1,
      drawManage.scale,
      drawManage.mapInfo.resolution,
      drawManage.mapInfo.origin.position.x,
      drawManage.mapInfo.origin.position.y,
    );
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    console.log(x0, y0, x1, y1);
  });
  ctx.strokeStyle = 'skyblue';
  ctx.lineWidth = 2;
  ctx.stroke();
}
</script>