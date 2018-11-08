import { Resource } from "./loaders/index";

/**
 * Node class looking table
 * @type {Object}
 */
export const node_class_map = {};

/**
 * Resource class looking table
 * @type {Object}
 */
export const res_class_map = {};

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
