import { defineStore } from 'pinia';
import { message } from "ant-design-vue";
import _ from 'lodash'
import { ref, type Ref } from 'vue';

export enum PatrolEvent {
	EVENT1 = '事件1',
	EVENT2 = '事件2',
	EVENT3 = '事件3',
}

export interface PatrolPoint {
	label_name: string;
	pose: {
		orientation: {
			x: number;
			y: number;
			z: number;
			w: number;
		};
		position: {
			x: number;
			y: number;
			z: number;
		};
	};
	events?: Array<PatrolEvent>;
}

export const usePatrolStore = defineStore('patrol', () => {
	const pointsSelected: Ref<PatrolPoint[]> = ref([]);
	const selectedSet: Set<string> = new Set();

	// let i = 0;
	// setInterval(() => {
	//     addPatrolPoint({
	//         label_name: `巡逻点${i++}`,
	//         pose: {
	//             orientation: {
	//                 x: i,
	//                 y: i,
	//                 z: i,
	//                 w: i,
	//             },
	//             position: {
	//                 x: i,
	//                 y: i,
	//                 z: i,
	//             }
	//         },
	//         events: [
	//             PatrolEvent.EVENT1,
	//             PatrolEvent.EVENT2,
	//         ]
	//     });
	// }, 2000);

	function initPoints() {
		pointsSelected.value = [];
	}

	function addPatrolPoint(point: PatrolPoint) {
		pointsSelected.value.push(point);
		selectedSet.add(point.label_name);
		message.error('添加巡逻点成功');
	}

	function delPatrolPoint(point: PatrolPoint) {
		const idx = pointsSelected.value.findIndex(p => p.label_name === point.label_name);
		pointsSelected.value.splice(idx, 1);
		selectedSet.delete(point.label_name);
		message.error('删除巡逻点成功');
	}

	function addEvent(point: PatrolPoint, event: PatrolEvent) {
		const { label_name } = point;
		const targetPoint = pointsSelected.value.find(p => p.label_name === label_name);
		if (!targetPoint) {
			message.error('获取巡逻点失败');
			return;
		}
		if (!targetPoint.events) targetPoint.events = [];
		targetPoint.events.push(event);
		message.error('添加事件成功');
	}

	function delEvent(point: PatrolPoint, eventIdx: number) {
		const { label_name } = point;
		const targetPoint = pointsSelected.value.find(p => p.label_name === label_name);
		if (!targetPoint) {
			message.error('获取巡逻点失败');
			return;
		}
		targetPoint.events?.splice(eventIdx, 1);
		message.error('删除事件成功');
	}

	function exitPatrol() {
		pointsSelected.value = [];
	}

	return {
		initPoints,
		addPatrolPoint,
		delPatrolPoint,
		addEvent,
		delEvent,
		exitPatrol,
		pointsSelected,
		selectedSet,
	}
});
