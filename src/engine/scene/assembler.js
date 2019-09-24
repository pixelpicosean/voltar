import {
    node_class_map,
    res_class_map,
    scene_class_map,
    resource_map,
} from 'engine/registry';
import { Node } from './main/node';


const has = Object.prototype.hasOwnProperty;

// Functions
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
    // Add `instance` static method
    scene['instance'] = () => {
        return assemble_scene(new scene, resource_map[url], url);
    };

    // Register as scene
    register_scene_class(url, scene);

    return scene;
}

/**
 * @typedef NodeData
 * @property {string} type
 * @property {string} name
 * @property {string} [filename]
 * @property {string} [parent]
 *
 * @typedef PackedSceneData
 * @property {NodeData[]} nodes
 * @property {Object<string, any>} sub
 * @property {Object<string, any>} ext
 */

/**
 * Assemble a scene(Node) with hierarchy data
 * @template {Node} T
 * @param {T} scn
 * @param {PackedSceneData} data
 * @param {string} url
 */
export function assemble_scene(scn, data, url) {
    /** @type {Object<string, Node>} */
    const node_cache = {};

    const nodes = data.nodes;
    for (let i = 0; i < nodes.length; i++) {
        const node_data = nodes[i];

        // find parent if any
        /** @type {Node} */
        let parent = null;
        if (i > 0) {
            parent = node_cache[node_data.parent];
            if (!parent) {
                console.warn(`Parent path '${node_data.parent}' for node '${node_data.name}' has vanished when instancing: '${url}'`);
            }
        }

        // inheritance
        if (i === 0) {
            scn.set_filename(url);
            scn._load_data(node_data);
            node_cache['.'] = scn;
        }

        // instanciate child nodes
        if (i > 0) {
            /** @type {Node} */
            const node = new (node_class_map[node_data.type]);
            parent.add_child(node);
            node._load_data(node_data);
            node_cache[node.name] = node;
        }
    }
    return scn;
}

/**
 * @param {NodeData | typeof Node} p_data
 */
export function instanciate_scene(p_data) {
}
