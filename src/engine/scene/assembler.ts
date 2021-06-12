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
export function register_scene_class<T extends Node>(key: string, ctor: { new(): T, instance(): T }) {
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
export function attach_script<T extends Node>(url: string, scene: { new(): T, instance(): T, filename?: string }) {
    register_scene_class(url, scene);
    scene["instance"] = () => {
        const inst = (get_resource_map()[url] as PackedScene).instance() as T;
        inst._script_ = true; // script classes cannot be recycled automatically
        return inst;
    };
    scene["filename"] = url;
}

export function instanciate_scene<T extends Node>(url: string): T {
    return (get_resource_map()[url] as PackedScene).instance() as T;
}
