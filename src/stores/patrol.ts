import { defineStore } from 'pinia';
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

export const usePatrolStore = defineStore('patrol', () => {
	const pointsSelected: Ref<PatrolPoint[]> = ref([]);
	const patroling = ref(false);
	const foxgloveClientStore = useFoxgloveClientStore();
	const globalStore = useGlobalStore();
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

	async function patrol() {
		if (pointsSelected.value.length === 0) return message.warning('未添加巡逻点！');
		patroling.value = false;
		const sec = Math.floor(Date.now() / 1000);
		const nsec = (Date.now() / 1000) * 1000000;
		const patrolPoints = pointsSelected.value.map(p => ({
			pose: {
				header: {
					frame_id: 'map',
					stamp: {
						sec,
						nsec,
					}
				},
				pose: p.pose
			},
			event_ids: p.events,
		}));
		console.log('patrol start ---------------', patrolPoints);
		const { result } = await foxgloveClientStore.callService(
			'/nav2_extended/start_patrol',
			{
				patrol_points: patrolPoints,
			}
		);
		console.log('patrol result ---------------', result);
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
			console.log('patrolMsgHandler', parseData);
			drawManage?.patrolUpdateCarPose(parseData);
		}
	}

	return {
		openPatrol,
		addPatrolPoint,
		delPatrolPoint,
		addEvent,
		delEvent,
		exitPatrol,
		patrol,
		pointsSelected,
		patroling,
	}
});
