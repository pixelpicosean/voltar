import { Resource } from "./loaders/index";
import { Transform, TransformStatic } from 'engine/math/index';

/**
 * Node class looking table
 * @type {Object}
 */
export const node_class_map = {};

/**
 * Plugins to be used in Node2D class
 * @type {Object}
 */
export const node_plugins = {
    TweenManager: null,
};

/**
 * @typedef PackedScene
 * @property {() => Node2D} instance
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

export const alternative = {
    Transform: TransformStatic,
}

export const optional = {
    Extract: null,
}
