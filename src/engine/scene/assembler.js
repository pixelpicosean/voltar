import {
    node_class_map,
    scene_class_map,
    resource_map,
} from 'engine/registry';
import { Node } from './main/node';


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
        const node = new scene;

        // data inherited from parent scene?
        const data = scene['@data'];
        if (data && data.length > 1) {
            for (let i = 0; i < data.length - 1; i++) {
                node._load_data(data[i]);
            }
        }

        const res = resource_map[url];

        // assemble the scene and load data
        assemble_scene(node, res, url);

        return node;
    };
    scene['filename'] = url;

    // Register as scene
    register_scene_class(url, scene);

    return scene;
}

/**
 * @typedef NodeData
 * @property {string} type
 * @property {string} name
 * @property {any} [instance]
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
    /** @type {Object<string, string>} */
    const path_cache = {};

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
            path_cache['.'] = '';
        }

        // instanciate child nodes
        if (i > 0) {
            /** @type {Node} */
            let node = null;
            if (node_data.instance) {
                if (node_data.instance.ctor) {
                    node = node_data.instance.ctor.instance();
                } else {
                    node = node_data.instance();
                }
            } else if (node_data.type) {
                node = new (node_class_map[node_data.type]);
            }

            if (node) {
                parent.add_child(node);
            } else {
                /* inherited node */
                node = parent.get_node(node_data.name);
            }
            node._load_data(node_data);
            let path = node.name;
            if (node_data.parent !== '.') {
                path = `${path_cache[node_data.parent]}/${path}`;
            }
            path_cache[path] = path;
            node_cache[path] = node;
        }
    }
    return scn;
}

/**
 * @param {PackedSceneData | string} p_data
 * @param {string} [url]
 */
export function instanciate_scene(p_data, url) {
    if (typeof (p_data) === 'string') {
        const ctor = scene_class_map[p_data];
        if (ctor) {
            return ctor.instance();
        } else {
            return instanciate_scene(/** @type{any} */(ctor), p_data);
        }
    }

    const node_data = p_data.nodes[0];
    /** @type {Node} */
    let node = null;
    if (node_data.type) {
        node = new (node_class_map[node_data.type]);
    } else {
        node = node_data.instance.ctor.instance();
    }

    assemble_scene(node, p_data, url);

    return node;
}
