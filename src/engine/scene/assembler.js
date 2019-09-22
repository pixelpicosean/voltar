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
 * @param {import('engine/registry').PackedScene} ctor Class to be registered
 */
export function register_scene_class(key, ctor) {
    if (!scene_class_map[key]) {
        scene_class_map[key] = ctor;
    } else {
        throw `[Class Register] scene with class "${key}" is already registered!`;
    }
}

/**
 * @param {String} url path to the scene (JSON from .tscn)
 * @param {typeof Node} scene Scene class
 */
export function attach_script(url, scene) {
    // Add `instance` static method
    scene.instance = () => {
        return assemble_scene(new scene(), resource_map[url]);
    };

    // Register as scene
    // @ts-ignore
    register_scene_class(url, scene);

    return scene;
}

/**
 * @typedef NodeData
 * @property {string} type
 * @property {string} name
 * @property {NodeData[]} children
 * @property {string} [filename]
 * @property {boolean} [_is_proxy_]
 * @property {string} [prop_key]
 * @property {any} [prop_value]
 */

/**
 * Assemble a scene(Node) with hierarchy data
 * @template {Node} T
 * @param {T} scn
 * @param {NodeData} data
 */
export function assemble_scene(scn, data) {
    if (data.type === 'Scene') {
        assemble_scene(scn, resource_map[data.filename]);
    }

    if (data.children) {
        assemble_node(scn, data.children);
    }

    scn._load_data(data);

    if (scn.data.filename.length === 0) {
        scn.data.filename = '_scene_without_filename_';
    }

    return scn;
}

/**
 * @template {Node} T
 * @param {NodeData | typeof Node} p_data
 */
export function instanciate_scene(p_data) {
    /** @type {NodeData} */
    let data = null;
    /** @type {typeof Node} */
    let ctor = null;

    if (typeof (p_data) === 'function') {
        ctor = p_data;
    } else {
        data = p_data;
    }

    /** @type {T} */
    let inst = null;

    if (ctor) {
        inst = /** @type {T} */(ctor.instance());
        return inst;
    }

    // Let's see whether it is registered
    const scene_class = has.call(scene_class_map, data.filename) ? scene_class_map[data.filename] : undefined;

    if (scene_class) {
        inst = /** @type {T} */(scene_class.instance());
    } else {
        // Scene data (converted from ".tscn")
        const parent_scene = resource_map[data.filename];

        if (parent_scene.type === 'Scene') {
            inst = instanciate_scene(parent_scene);
        } else {
            inst = new (node_class_map[parent_scene.type])();

            // Create child nodes of parent scene
            assemble_node(inst, parent_scene.children);

            // Load parent scene data
            inst._load_data(parent_scene);
        }
    }

    // Create child nodes
    assemble_node(inst, data.children);

    // Load override data from parent scene
    inst._load_data(data);

    if (inst.data.filename.length === 0) {
        inst.data.filename = '_scene_without_filename_';
    }

    return inst;
}

/**
 * @template {Node} T
 * @param {T} node
 * @param {NodeData[]} children
 */
function assemble_node(node, children) {
    if (!children || children.length === 0) {
        return;
    }

    let i, data, inst;
    for (i = 0; i < children.length; i++) {
        data = children[i];

        // Override an existing node
        const child = node.named_children.get(data.name);
        if (child) {
            child._load_data(data);
            assemble_node(child, data.children);
        }
        // Insert new child node
        else {
            if (data.type === 'Scene') {
                inst = instanciate_scene(data);
            } else {
                if (data._is_proxy_) {
                    if (res_class_map.hasOwnProperty(data.prop_value.type)) {
                        // @ts-ignore
                        inst = new (res_class_map[data.prop_value.type])()._load_data(data.prop_value);
                    } else {
                        inst = data.prop_value;
                    }
                } else {
                    inst = new (node_class_map[data.type])()._load_data(data);
                }
            }

            if (data._is_proxy_) {
                node[`set_${data.prop_key}`](inst);
            } else {
                node.add_child(inst);
                assemble_node(inst, data.children);
            }
        }
    }
}
