import { defineStore, storeToRefs } from 'pinia';
import { message } from "ant-design-vue";
import _ from 'lodash'
import { ref, type Ref } from 'vue';
import { useFoxgloveClientStore } from './foxgloveClient';
import type { MessageData } from '@foxglove/ws-protocol';
import type { Header, Stamp } from '@/typings';
import { useGlobalStore } from './global';
import type DrawManage from '@/utils/draw';

export enum PatrolEvent {
	EVENT1 = '事件1',
	EVENT2 = '事件2',
	EVENT3 = '事件3',
}

export interface Pose {
	position: {
		x: number;
		y: number;
		z: number;
	};
	orientation: {
		x: number;
		y: number;
		z: number;
		w: number;
	};
}

export interface PatrolPoint {
	label_name: string;
	pose: Pose;
	events?: Array<PatrolEvent>;
}

export interface PatrolTopicMsg {
	current_pose: {
		header: Header
		pose: Pose
	}
	navigation_time: Stamp
	estimated_time_remaining: Stamp
	number_of_recoveries: number
	distance_remaining: number
	number_of_poses_remaining: number
}

export interface Task {
	task_name: string;
	patrol_points: Array<{
		label_name: string,
		pose: Pose,
		event_ids: Array<PatrolEvent>,
	}>;
}

interface AddPatrolTaskReq {
	task: Task;
}

interface DelPatrolTaskReq {
	task_name: string;
}

interface GetPatrolTaskRes {
	result: boolean;
	tasks: Array<Task>
}

export interface StartPatrolReq {
	task_name: string;
	loop_count: number;
}


export const usePatrolStore = defineStore('patrol', () => {
	const pointsSelected: Ref<PatrolPoint[]> = ref([]);
	const patrolMode = ref(false);
	const patroling = ref(false);
	const foxgloveClientStore = useFoxgloveClientStore();
	const globalStore = useGlobalStore();
	const taskList = ref<Task[]>([]);
	let drawManage: DrawManage | null = null;
	let subId = -1;

	function openPatrol(dm: DrawManage) {
		drawManage = dm;
		pointsSelected.value = [];
		globalStore.setLoading(true);
		foxgloveClientStore.subscribeTopic('/nav2_extended/navigate_through_poses_topic').then((res) => {
			console.log('subscribePatrolTopic', res);
			subId = res;
			foxgloveClientStore.listenMessage(patrolMsgHandler);
		}).finally(() => {
			globalStore.setLoading(false);
		});
	}

	function addPatrolPoint(point: PatrolPoint) {
		pointsSelected.value.push(_.cloneDeep(point));
		message.success('添加巡逻点成功');
	}

	function delPatrolPoint(idx: number) {
		pointsSelected.value.splice(idx, 1);
		message.success('删除巡逻点成功');
	}

	function addEvent(event: PatrolEvent, pointIdx: number) {
		const targetPoint = pointsSelected.value[pointIdx];
		if (!targetPoint) {
			message.error('获取巡逻点失败');
			return false;
		}
		if (!targetPoint.events) targetPoint.events = [];
		targetPoint.events.push(event);
		message.success('添加事件成功');
		return true;
	}

	function delEvent(idx: number, eventIdx: number) {
		const targetPoint = pointsSelected.value[idx];
		if (!targetPoint) {
			message.error('事件删除失败');
			return;
		}
		targetPoint.events?.splice(eventIdx, 1);
	}

	function exitPatrol() {
		pointsSelected.value = [];
    foxgloveClientStore.stopListenMessage(patrolMsgHandler);
		foxgloveClientStore.unSubscribeTopic(subId);
		subId = -1;
	}

	async function patrol(params: StartPatrolReq) {
		const { result } = await foxgloveClientStore.callService('/nav2_extended/start_patrol', params);
		if (result) {
			patroling.value = true;
			message.success('巡逻中...');
		}
		else message.error('巡逻失败');
	}

	async function stopPatrol() {
		const { result } = await foxgloveClientStore.callService('/nav2_extended/stop_patrol', {});
		console.log('stopPatrol result', result);
	}

	function patrolMsgHandler({
		op,
		subscriptionId,
		timestamp,
		data,
	}: MessageData) {
		if (subId === subscriptionId) {
			const parseData = foxgloveClientStore.readMsgWithSubId(
				subId,
				data,
			) as PatrolTopicMsg;
			// drawManage?.patrolUpdateCarPose(parseData);
		}
	}

	async function addPatrolTask({taskName} : {taskName: string}) {
		const params: AddPatrolTaskReq = {
			task: {
				task_name: taskName,
				patrol_points: pointsSelected.value.map(p => ({
					label_name: p.label_name,
					pose: p.pose,
					event_ids: p.events || [],
				})),
			}
		}
		const { result } = await foxgloveClientStore.callService('/nav2_extended/add_patrol_task', params);
		if (!result) return message.error('添加巡逻任务失败');
		taskList.value.push(params.task);
	}

	async function delPatrolTask(params: DelPatrolTaskReq) {
		const { result } = await foxgloveClientStore.callService('/nav2_extended/stop_patrol', params);
		if (!result) message.error('删除巡逻任务失败');
		else message.success('删除巡逻任务成功');
	}

	async function getPatrolTask() {
		const { result, tasks }: GetPatrolTaskRes = await foxgloveClientStore.callService('/nav2_extended/stop_patrol',{});
		if (!result) return message.error('获取巡逻任务失败');
		taskList.value = tasks;
	}

	function loadSelectedTask(idx: number) {
		pointsSelected.value = taskList.value[idx].patrol_points.map(p => {
			const point: PatrolPoint = {
				label_name: p.label_name,
				pose: p.pose,
				events: p.event_ids,
			}
			return point;
		});
	}

	return {
		openPatrol,
		addPatrolPoint,
		delPatrolPoint,
		addEvent,
		delEvent,
		exitPatrol,
		patrol,
		stopPatrol,
		addPatrolTask,
		delPatrolTask,
		getPatrolTask,
		loadSelectedTask,
		pointsSelected,
		patrolMode,
		patroling,
		taskList,
	}
});

export const usePatrolStoreToRefs = () => storeToRefs(usePatrolStore());
