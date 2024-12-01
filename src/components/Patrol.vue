<template>
	<div>
		<a-button type="primary" @click="addPatrolPoint">添加巡逻点</a-button>
		<ul class="patrol-list">
			<li v-for="(point, idx) in pointsSelected" :key="idx">
				<div>
					<span>{{ point.label_name }}</span>
					<a-button type="primary" @click="openAddEventModal(point)">添加事件</a-button>
				</div>
				<ol>
					<li v-for="(event, idx) in point?.events" :key="idx">
						<span>{{ event }}</span>
						<a-button type="primary" danger @click="delEvent(point, idx);">删除事件</a-button>
					</li>
				</ol>
			</li>
		</ul>
		<a-modal v-model:open="showEventsModal" title="Basic Modal" @ok="confirmAddEvent">
      <a-select
    	  ref="select"
    	  v-model:value="selectedEvent"
    	  style="width: 120px"
    	>
    	  <a-select-option v-for="(event, idx) in PatrolEvent" :key="idx">{{ event }}</a-select-option>
    	</a-select>
    </a-modal>
	</div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { usePatrolStore, PatrolEvent, type PatrolPoint } from '@/stores/patrol';
import DrawManage from '@/utils/draw';
import { ref } from 'vue';

const globalStore = useGlobalStore();
const { pointsSelected, addEvent, delEvent } = usePatrolStore();
const showEventsModal = ref(false);
const selectedEvent = ref(PatrolEvent.EVENT1);
let selectedPoint: PatrolPoint | null = null;

const props = defineProps<{
	props: {
		drawManage: DrawManage,
	}
}>();
console.log('props', props);

const addPatrolPoint = () => {
	props.props.drawManage.drawPatrolPoints;
	globalStore.closeModal();
}

const openAddEventModal = (point: PatrolPoint) => {
	showEventsModal.value = true;
	selectedPoint = point;
}

const confirmAddEvent = () => {
	addEvent(selectedPoint!, selectedEvent.value);
}
</script>

<style lang="less" scoped>
.patrol-list {
	height: 500px;
	overflow-y: scroll;
}
</style>
  