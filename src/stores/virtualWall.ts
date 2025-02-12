import { defineStore, storeToRefs } from 'pinia';
import _ from 'lodash'
import { ref, type Ref } from 'vue';
import { useFoxgloveClientStore } from './foxgloveClient';
import { message } from 'ant-design-vue';

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
	const mapName = ref('');

	async function getVWs() {
		console.log('getVWs params ---------------', mapName.value);
		if (!mapName.value) return;
		const { result, walls } = await foxgloveClientStore.callService(
			'/nav2_extended/get_virtual_walls',
			{
				map_name: mapName.value,
			}
		);
		console.log('getVWs result ---------------', result, walls);
		virtualWalls.value = walls;
	}

	async function addVW(walls: ILine[]) {
		if (walls.length === 0) return message.warning('未绘制虚拟墙!');
		const res = await foxgloveClientStore.callService(
			'/nav2_extended/add_virtual_walls',
			{
				map_name: mapName.value,
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
				map_name: mapName.value,
				wall_id: wallId,
			}
		);
		getVWs();
		return result;
	}

	function setMapName(name: string) {
		mapName.value = name;
	}

	return {
		getVWs,
		addVW,
		delVW,
		setMapName,
		virtualWalls,
	}
});

export const useVirtualWallStoreRef = () => storeToRefs(useVirtualWallStore());
