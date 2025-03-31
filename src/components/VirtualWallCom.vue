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

const props = defineProps<{
	drawManage: DrawManage,
  mapName?: string | null,
}>();
const { drawManage } = props;

const virtualWallStore = useVirtualWallStore();
let vwContainer = document.getElementById('vwContainer');
let canvas: HTMLCanvasElement | null = null;

onMounted(() => {
  if (!drawManage.img) return;
  if (props.mapName != '') virtualWallStore.setMapName(props.mapName!);
  virtualWallStore.getVWs();
  drawVWs(drawManage.img!.width, drawManage.img!.height);
});

watch(
  () => props.mapName,
  () => {
    console.log('props mapName', props.mapName);
    if (!props.mapName) return;
    virtualWallStore.setMapName(props.mapName);
    virtualWallStore.getVWs();
  }
)

watch(
  () => virtualWallStore.virtualWalls,
  () => {
    drawManage.vwDrawer?.drawInteractivePoint(drawManage.mapInfo, drawManage.scale);
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
    let { x: x0, y: y0 } = worldCoordinateToPixel(
      wall.x0,
      wall.y0,
      drawManage.scale,
      drawManage.mapInfo.resolution,
      drawManage.mapInfo.origin.position.x,
      drawManage.mapInfo.origin.position.y,
    );
    let { x: x1, y: y1 } = worldCoordinateToPixel(
      wall.x1,
      wall.y1,
      drawManage.scale,
      drawManage.mapInfo.resolution,
      drawManage.mapInfo.origin.position.x,
      drawManage.mapInfo.origin.position.y,
    );
    y0 = drawManage.imgWrap!.offsetHeight - y0;
    y1 = drawManage.imgWrap!.offsetHeight - y1;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  });
  ctx.strokeStyle = 'orange';
  ctx.lineWidth = 5;
  ctx.stroke();
}
</script>