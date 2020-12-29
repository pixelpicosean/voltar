import {
    get_resource_map,
    scene_class_map,
} from 'engine/registry';
import { Node } from './main/node';
import { PackedScene } from './resources/packed_scene';

/**
 * Register scene class, for packed scene instancing process
 * @param key  Key of the scene class
 * @param ctor Class to be registered
 */
export function register_scene_class(key: string, ctor: { new(): Node, instance(): Node }) {
    if (!scene_class_map[key]) {
        scene_class_map[key] = ctor;
    } else {
        throw `[Class Register] scene with class "${key}" is already registered!`;
    }
}

/**
 * @param url path to the scene (JSON from .tscn)
 * @param scene Scene class
 */
export function attach_script(url: string, scene: { new(): Node, instance(): Node }) {
    register_scene_class(url, scene);
    scene["instance"] = () => {
        return (get_resource_map()[url] as PackedScene).instance();
    };
}

export function instanciate_scene(url: string): Node {
    return (get_resource_map()[url] as PackedScene).instance();
}
