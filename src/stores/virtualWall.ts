import { defineStore } from 'pinia';
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
	const virtualWalls: Ref<IVirtualWall[]> = ref([
		// {
		// 	wall_id: 345,
		// 	x0: 1.0,
		// 	y0: 1.0,
		// 	x1: 2.5,
		// 	y1: 3.5
		// },
		// {
		// 	wall_id: 248,
		// 	x0: 1.0,
		// 	y0: 3.2,
		// 	x1: 2.1,
		// 	y1: 1.0
		// },
	]);
	const foxgloveClientStore = useFoxgloveClientStore();
	let mapName = '';

	async function getVWs() {
		const { result, walls } = await foxgloveClientStore.callService(
			'/nav2_extended/get_virtual_walls',
			{
				map_name: mapName,
			}
		);
		console.log('getVWs result ---------------', result, walls);
		virtualWalls.value = walls;
	}

	async function addVW(walls: ILine[]) {
		const res = await foxgloveClientStore.callService(
			'/nav2_extended/add_virtual_walls',
			{
				map_name: mapName,
				walls,
			},
		);
		getVWs();
		return {
			result: res.result,
			wallIds: [...res.wall_ids],
		}
	}

	async function delVW(wallId: number) {
		const { result } = await foxgloveClientStore.callService(
			'/nav2_extended/del_virtual_wall',
			{
				map_name: mapName,
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
		mapName,
	}
});
