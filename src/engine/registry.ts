import { LoadTypes } from './core/io/const';

interface ResourceInterface {
    _load_data(data: any): any;
}

/**
 * Node class looking table
 */
export const node_class_map: { [name: string]: any } = {};

/**
 * Resource class looking table
 */
export const res_class_map: { [name: string]: { new(): ResourceInterface } } = {};

type PackedSceneClass = { new(): import('engine/scene/main/node').Node, instance(): import('engine/scene/main/node').Node };
/**
 * Scene class looking table
 */
export const scene_class_map: { [name: string]: PackedSceneClass } = Object.create(null);

export const preload_queue = {
    is_start: false,
    is_complete: false,
    queue: <{ type: LoadTypes, url: string, key?: string, params?: any }[]>[],
};

let resource_map_: { [key: string]: any } = {};

export const set_resource_map = (data: { [key: string]: any }) => resource_map_ = data;

export const get_resource_map = () => resource_map_;

let binary_pack_list: Uint8Array[] = [];
export const set_binary_pack_list = (list: ArrayBuffer[]) => {
    binary_pack_list = list.map(ab => new Uint8Array(ab));
};
export const get_binary_pack = (idx: number) => binary_pack_list[idx];

let json_pack_list: any[] = [];
export const set_json_pack_list = (list: any[]) => {
    json_pack_list = list;
};
export const get_json_data = (idx: number) => json_pack_list[idx];
