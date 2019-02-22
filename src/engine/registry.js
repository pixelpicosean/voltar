import Resource from "engine/core/io/Resource";

/**
 * Node class looking table
 * @type {Object}
 */
export const node_class_map = {};

/**
 * Resource class looking table
 * @type {Object<string, GeneratorFunctionConstructor>}
 */
export const res_class_map = {};

/**
 * @type {Object<string, (key: string, data: any, resource_map: Object<string, any>) => any>}
 */
export const res_procs = {};

/**
 * Plugins to be used in Node2D class
 * @type {Object}
 */
export const node_plugins = {
    TweenManager: null,
};

/**
 * @typedef PackedScene
 * @property {() => import('./scene/Node2D').default} instance
 */
/**
 * Scene class looking table
 * @type {Object<string, PackedScene>}}
 */
export const scene_class_map = Object.create(null);

/**
 * @type {Array<() => ((res: Resource, next: Function) => void)>}
 */
export const loader_pre_procs = [];

/**
 * @type {Array<() => ((res: Resource, next: Function) => void)>}
 */
export const loader_use_procs = [];

export const optional = {
    Extract: null,
}
