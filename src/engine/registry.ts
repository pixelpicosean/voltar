class ResourceInterface {
    _load_data(data: any): void { }
}

/**
 * Node class looking table
 */
export const node_class_map: { [name: string]: any } = {};

/**
 * Resource class looking table
 */
export const res_class_map: { [name: string]: typeof ResourceInterface } = {};

type PackedScene = { instance: () => import('engine/scene/main/node.js').Node };
/**
 * Scene class looking table
 */
export const scene_class_map: { [name: string]: PackedScene } = Object.create(null);

export const loader_pre_procs: (() => ((res: import("engine/core/io/io_resource").default, next: Function) => void))[] = [];
export const loader_use_procs: (() => ((res: import("engine/core/io/io_resource").default, next: Function) => void))[] = [];

export const preload_queue = {
    is_start: false,
    is_complete: false,
    queue: [] as (string|object)[][],
};

/** @type {Object<string, any>} */
let resource_map_: { [key: string]: any } = {};
let raw_resource_map_: { [key: string]: any } = {};

export const set_resource_map = (data: { [key: string]: any }) => resource_map_ = data;
export const set_raw_resource_map = (data: { [key: string]: any }) => raw_resource_map_ = data;

export const get_resource_map = () => resource_map_;
export const get_raw_resource_map = () => raw_resource_map_;

let binary_pack_list: Uint8Array[] = [];
export const set_binary_pack_list = (list: Uint8Array[]) => {
    binary_pack_list = list.map(ab => new Uint8Array(ab));
};
export const get_binary_pack = (idx: number) => binary_pack_list[idx];

let json_pack_list: any[] = [];
export const set_json_pack_list = (list: any[]) => {
    json_pack_list = list;
};
export const get_json_data = (idx: number) => json_pack_list[idx];
