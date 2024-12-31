import { defineStore } from 'pinia';
import { message } from "ant-design-vue";
import _ from 'lodash'
import { ref, type Ref } from 'vue';
import { useFoxgloveClientStore } from './foxgloveClient';

export interface ILine {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export interface IVirtualWall extends ILine {
	wall_id: number;
}

export const useVirtualWallStore = defineStore('virtualWall', () => {
	const virtualWalls: Ref<IVirtualWall[]> = ref([]);
	const foxgloveClientStore = useFoxgloveClientStore();

	async function getVWs() {
		const { result, walls } = await foxgloveClientStore.callService(
			'/global_costmap/global_costmap/get_virtual_walls',
			{}
		);
		console.log('getVWs result ---------------', result, walls);
		virtualWalls.value = walls;
	}

	async function addVW(data: ILine | ILine[]) {
		let serviceName = '/global_costmap/global_costmap/add_virtual_wall';
		if (Array.isArray(data)) serviceName = '/global_costmap/global_costmap/add_virtual_walls';
		
		const res = await foxgloveClientStore.callService(
			serviceName,
			{data},
		);
		let wallIds = [];
		if (Array.isArray(data)) wallIds = [...res.wall_ids];
		else wallIds = [res.wall_id];

		getVWs();
		return {
			result: res.result,
			wallIds,
		}
	}

	async function delVW(wallId: number) {
		const { result } = await foxgloveClientStore.callService(
			'/global_costmap/global_costmap/del_virtual_wall',
			{
				wall_id: wallId,
			}
		);
		getVWs();
		return result;
	}

	return {
		getVWs,
		addVW,
		delVW,
		virtualWalls,
	}
});
