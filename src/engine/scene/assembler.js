import {
    get_resource_map,
    scene_class_map,
} from 'engine/registry';
import { Node } from './main/node.js';
import { PackedScene } from './resources/packed_scene';


/**
 * Register scene class, for packed scene instancing process
 * @param {string} key  Key of the scene class
 * @param {typeof Node} ctor Class to be registered
 */
export function register_scene_class(key, ctor) {
    if (!scene_class_map[key]) {
        scene_class_map[key] = ctor;
    } else {
        throw `[Class Register] scene with class "${key}" is already registered!`;
    }
}

/**
 * @param {string} url path to the scene (JSON from .tscn)
 * @param {typeof Node} scene Scene class
 */
export function attach_script(url, scene) {
    register_scene_class(url, scene);
    scene["instance"] = () => {
        return /** @type {PackedScene} */(get_resource_map()[url]).instance();
    };
}

/**
 * @param {string} url
 */
export function instanciate_scene(url) {
    /** @type {PackedScene} */(get_resource_map()[url]).instance();
}
