class ResourceInterface {
    /** @param {any} data */
    _load_data(data) { }
}

/**
 * Node class looking table
 * @type {Object<string, any>}
 */
export const node_class_map = {};

/**
 * Resource class looking table
 * @type {Object<string, typeof ResourceInterface>}
 */
export const res_class_map = {};

/**
 * @typedef PackedScene
 * @property {() => import('engine/scene/main/node').Node} instance
 */
/**
 * Scene class looking table
 * @type {Object<string, PackedScene>}}
 */
export const scene_class_map = Object.create(null);

/**
 * @type {Array<() => ((res: import("engine/core/io/io_resource").default, next: Function) => void)>}
 */
export const loader_pre_procs = [];

/**
 * @type {Array<() => ((res: import("engine/core/io/io_resource").default, next: Function) => void)>}
 */
export const loader_use_procs = [];

export const preload_queue = {
    is_start: false,
    is_complete: false,
    /** @type {(string|Object)[][]} */
    queue: [],
};

// import resources from 'resources.json';

/** @type {Object<string, any>} */
let resource_map_ = {};
/** @type {Object<string, any>} */
let raw_resource_map_ = {};

/** @param {Object<string, any>} data */
export const set_resource_map = (data) => resource_map_ = data;
/** @param {Object<string, any>} data */
export const set_raw_resource_map = (data) => raw_resource_map_ = data;

export const get_resource_map = () => resource_map_;
export const get_raw_resource_map = () => raw_resource_map_;
