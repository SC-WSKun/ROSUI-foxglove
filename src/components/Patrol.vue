<template>
	<div style="display: flex;">
		<div style="flex-grow: 1;">
			<div class="top-btns">
				<a-button type="primary" @click="addPatrolPoint">添加巡逻点</a-button>
				<div>
					<a-input-number
						v-model:value="count"
						:min="1"
						style="width: 50px; text-align: center;"
					/>
					<span style="display: inline-block; vertical-align: middle; padding-left: 10px;">次</span>
				</div>
				<a-button type="primary" @click="startPatrol">开始巡逻</a-button>
			</div>
			<ul class="patrol-list">
				<li v-for="(point, idx) in pointsSelected" :key="idx">
					<div  style="display: flex; justify-content: space-between;">
						<span>{{ point.label_name }}</span>
						<div>
							<span class="del-btn" @click="delPatrolPoint(idx)">x</span>
							<a-button @click="openAddEventModal(idx)">添加事件</a-button>
						</div>
					</div>
					<div class="tag-container">
						<VueDraggable v-if="point.events" v-model="point.events">
							<a-tag
								v-for="(event, eIdx) in point?.events"
								:key="event"
								closable
								@close.prevent="delEvent(idx, eIdx)"
							>
								{{ event }}
							</a-tag>
  	  			</VueDraggable>
					</div>
				</li>
			</ul>
		</div>
		<div
			v-if="showEventsModal"
			class="events-list-container"
		>
			<a-button type="primary" @click="showEventsModal = false">关闭</a-button>
			<p class="tip">Tip: 巡逻点事件可拖动排序</p>
			<ul class="events-list">
				<li
					v-for="(event, idx) in PatrolEvent"
					:key="idx"
					@click="confirmAddEvent(event)"
				>
					{{ event }}
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { usePatrolStore, PatrolEvent } from '@/stores/patrol';
import DrawManage from '@/utils/draw';
import { message } from 'ant-design-vue';
import { ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';

const globalStore = useGlobalStore();
const { pointsSelected, delPatrolPoint, addEvent, delEvent } = usePatrolStore();
const showEventsModal = ref(false);
const pointIdx = ref(-1);
const count = ref(1);

const props = defineProps<{
	props: {
		drawManage: DrawManage,
	}
}>();

const addPatrolPoint = () => {
	props.props.drawManage.drawPatrolPoints();
	globalStore.closeModal();
	message.info('请在地图上选择巡逻点');
}

const openAddEventModal = (idx: number) => {
	showEventsModal.value = true;
	pointIdx.value = idx;
}

const confirmAddEvent = (event: PatrolEvent) => {
	addEvent(event, pointIdx.value);
}

const startPatrol = () => {
	if (pointsSelected.length === 0) return message.info('请先选择巡逻点');
	globalStore.closeModal();
	message.success('巡逻中...');
	props.props.drawManage.startPatrol();
}
</script>

<style lang="less" scoped>
.top-btns {
	display: flex;
	justify-content: space-between;
}

.patrol-list {
	max-height: 400px;
	overflow-y: auto;
	& > li {
		padding: 5px 0;
	}
}

.del-btn {
	cursor: pointer;
	display: inline-block;
	color: #fff;
	width: 20px;
	height: 20px;
	text-align: center;
	line-height: 18px;
	border-radius: 50%;
	background-color: red;
	flex-shrink: 0;
	transition: 0.2s linear;
	margin-right: 10px;
	&:hover {
		transform: scale(1.2);
	}
}

.tag-container {
	margin-top: 10px;
}

.events-list-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	border-left: 2px solid #ccc;
	padding-left: 10px;
	margin-left: 10px;
	.tip {
		font-size: 12px;
	}
	.events-list {
		list-style: none;
		margin: 0;
		padding-left: 0;
		li {
			cursor: pointer;
			font-family: 'Roboto Slab', serif;
			width: 150px;
			height: 35px;
			line-height: 35px;
			padding-left: 10px;
			background-color: peachpuff;
			border-radius: 10px;
			margin-bottom: 10px;
			&:hover {
				background-color: #f9c08e;
			}
		}
	}
}
</style>
  