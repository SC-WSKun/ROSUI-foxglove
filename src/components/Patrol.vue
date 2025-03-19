<template>
	<div style="display: flex;">
		<div style="flex-grow: 1;">
			<div class="top-btns">
				<a-button type="primary" @click="addPatrolPoint">添加巡逻点</a-button>
				<a-input v-model:value="inputTaskName" placeholder="请输入任务名称" style="width: 180px;" />
				<a-button type="primary" @click="addPatrolTask">创建任务</a-button>
			</div>
			<div class="top-btns" style="margin-top: 20px;">
				<a-button type="primary" @click="stopPatrol">停止巡逻</a-button>
				<a-button type="primary" @click="startPatrol">开始巡逻</a-button>
				<div>
					<a-input-number
						v-model:value="loopCount"
						:min="1"
						style="width: 65px; text-align: center;"
					/>
					<span style="display: inline-block; vertical-align: middle; padding-left: 10px;">次</span>
				</div>
			</div>
			<ul class="patrol-list">
				<li v-for="(point, idx) in pointsSelected" :key="idx">
					<div  style="display: flex; justify-content: space-between;">
						<div>
							<span>{{ point.label_name }}</span>
							<SendOutlined v-if="pointIdx === idx" class="icon"/>
						</div>
						<div>
							<span class="del-btn" @click="patrolStore.delPatrolPoint(idx)">x</span>
							<a-button @click="openAddEventModal(idx)">添加事件</a-button>
						</div>
					</div>
					<div class="tag-container">
						<VueDraggable v-if="point.events" v-model="point.events">
							<a-tag
								v-for="(event, eIdx) in point?.events"
								:key="event"
								closable
								@close.prevent="patrolStore.delEvent(idx, eIdx)"
							>
								{{ event }}
							</a-tag>
  	  			</VueDraggable>
					</div>
				</li>
			</ul>
		</div>
		<!-- 事件列表 -->
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
		<!-- 任务列表 -->
		<div class="task-list" :style="`width: ${showEventsModal ? '175' : '330'}px`">
			<h3>任务列表</h3>
			<span v-if="taskList.length === 0">暂无巡逻任务，请创建</span>
			<ul v-else>
				<li
					v-for="(task, idx) in taskList"
					@click="selectTask(idx)"
				>
					<span :class="`task-name ${selectedTaskIdx === idx ? 'active' : ''}`">{{ task.task_name }}</span>
					<span class="task-del" @click.stop="delPatrolTask(task)">删除</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useGlobalStore } from '@/stores/global';
import { type Task, type StartPatrolReq, usePatrolStore, usePatrolStoreToRefs, PatrolEvent } from '@/stores/patrol';
import DrawManage from '@/utils/draw';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { SendOutlined } from '@ant-design/icons-vue';

const globalStore = useGlobalStore();
const patrolStore = usePatrolStore();
const { pointsSelected, taskList } = usePatrolStoreToRefs();
const showEventsModal = ref(false);
const selectedTaskIdx = ref(-1);
const pointIdx = ref(-1);
const loopCount = ref(1);
const inputTaskName = ref('');

const props = defineProps<{
	props: {
		drawManage: DrawManage,
	}
}>();

onMounted(() => {
  patrolStore.getPatrolTask();
})

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
	patrolStore.addEvent(event, pointIdx.value);
}

const addPatrolTask = () => {
	if (pointsSelected.value.length === 0) return message.info('请先选择巡逻点');
	if (inputTaskName.value === '') return message.info('请输入任务名称');
	patrolStore.addPatrolTask({taskName: inputTaskName.value});
}

const delPatrolTask = (task: Task) => {
	patrolStore.delPatrolTask({ task_name: task.task_name });
}

const startPatrol = () => {
	if (taskList.value.length === 0) return message.info('请先创建任务');
	if (selectedTaskIdx.value === -1) return message.info('请先选择任务');
	globalStore.closeModal();
	message.success('巡逻中...');
	const patrolReq: StartPatrolReq = {
		task_name: taskList.value[selectedTaskIdx.value].task_name,
		loop_count: loopCount.value ?? 1,
	};
	props.props.drawManage.startPatrol(patrolReq);
}

const stopPatrol = () => {
	message.success('停止巡逻');
	patrolStore.stopPatrol();
}

const selectTask = (idx: number) => {
	selectedTaskIdx.value = idx;
	patrolStore.loadSelectedTask(idx);
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
	width: 165px;
	flex-direction: column;
	align-items: center;
	border-left: 2px solid #ccc;
	padding-left: 20px;
	margin-left: 20px;
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
			width: 100px;
			height: 35px;
			line-height: 35px;
			padding-left: 10px;
			border: 1px solid peachpuff;
			border-radius: 10px;
			margin-bottom: 10px;
			&:hover {
				background-color: #f9c08e;
			}
		}
	}
}

.task-list {
	display: flex;
	width: 165px;
	flex-direction: column;
	align-items: center;
	border-left: 2px solid #ccc;
	padding-left: 20px;
	margin-left: 20px;
	ul {
		list-style: none;
		margin: 0;
		padding-left: 0;
		margin-top: 16px;
		li {
			.task-name {
				display: inline-block;
				cursor: pointer;
				font-family: 'Roboto Slab', serif;
				width: 100px;
				height: 35px;
				line-height: 35px;
				padding-left: 10px;
				color: #000;
				border: 1px solid #5b63d3;
				border-radius: 10px;
				margin-bottom: 10px;
				&:hover, &.active {
					color: #fff;
					background-color: #6169db;
				}
			}
		}
		.task-del {
			cursor: pointer;
			color: red;
			margin-left: 10px;
			&:hover {
				opacity: 0.8;
			}
		}
	}
}

.icon {
	animation: icon 2s infinite ease;
	margin-left: 10px;
	rotate: 180deg;
}

@keyframes icon {
	0% {
		transform: translateX(0);
	}
	50% {
		transform: translateX(-10px);
	}
	100% {
		transform: translateX(0);
	}
}
</style>
  