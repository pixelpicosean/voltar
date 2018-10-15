// import polyfills. Done as an export to make sure polyfills are imported first
export * from './polyfill/index';

// Dependence
export * from 'engine/dep/index';

// Node
import Node2D from './scene/Node2D';

export { default as Node2D } from './scene/Node2D';

export { default as Sprite } from './scene/sprites/Sprite';
export { default as AnimatedSprite } from './scene/sprites/AnimatedSprite';
export { default as TilingSprite } from './scene/sprites/TilingSprite';
export { default as NineSliceSprite } from './scene/sprites/NineSliceSprite';
// import CoaSprite from './scene/coa_sprite/CoaSprite';

// import Graphics from './scene/graphics/Graphics';

// import BackgroundMap from './scene/map/BackgroundMap';
// import CollisionMap from './scene/map/CollisionMap';

// import ParticleNode2D from './scene/particles/ParticleNode2D';

// import Mesh from './scene/mesh/Mesh';
// import Plane from './scene/mesh/Plane';
// import NineslicePlane from './scene/mesh/NineslicePlane';
// import Rope from './scene/mesh/Rope';

// import Timer from './scene/Timer';

import {
    node_class_map,
    scene_class_map,
} from 'engine/registry';

// Class
// export { default as GraphicsRenderer } from './scene/graphics/webgl/GraphicsRenderer';

// export { default as MeshRenderer } from './scene/mesh/webgl/MeshRenderer';

export { default as Texture } from './textures/Texture';
export { default as BaseTexture } from './textures/BaseTexture';
export { default as RenderTexture } from './textures/RenderTexture';
export { default as BaseRenderTexture } from './textures/BaseRenderTexture';
export { default as TextureUvs } from './textures/TextureUvs';
export { default as TextureMatrix } from './textures/TextureMatrix';

export { default as RectangleShape2D } from './scene/physics/RectangleShape2D';
export { default as Area2D } from './scene/physics/Area2D';
export { default as PhysicsBody2D } from './scene/physics/PhysicsBody2D';

export { default as Input } from './input/index';
export { default as SceneTree } from './SceneTree';

// Global constant, setting and function
import settings from './settings';
export * from './const';
export * from './math/index';
export * from './rnd';

// Namespace
// import * as accessibility from './accessibility/index';
import * as loaders from './loaders/index';
import * as ticker from './ticker/index';
import * as utils from './utils/index';

export {
    settings,

    loaders,
    ticker,
    utils,
}

// Instances
import Input from './input/index';
import SceneTree from './SceneTree';

// Global instances
const preload_queue = [];

export const input = new Input();
export const scene_tree = new SceneTree(input, preload_queue);
// export const sound = audio.SoundLibrary.init(loaders.Resource, loaders.Loader);

/**
 * Preload a resource before game start
 * @param {string} key Key of the resource
 * @param {string} [url] URL of the resource
 */
export function preload(key, url) {
    preload_queue.push({ key, url });
}

/**
 * @typedef PackedScene
 * @property {() => Node2D} instance
 */
// Functions
/**
 * Register scene class, for packed scene instancing process
 * @param {string} key  Key of the scene class
 * @param {PackedScene} ctor Class to be registered
 */
export function register_scene_class(key, ctor) {
    if (!scene_class_map[key]) {
        scene_class_map[key] = ctor;
    } else {
        throw `[Class Register] scene with class "${key}" is already registered!`;
    }
}

/**
 * Assemble a scene(Node2D) with hierarchy data
 * @param {Node2D} scn
 * @param {any} data data
 * @returns {Node2D}
 */
export function assemble_scene(scn, data) {
    if (data.name) {
        scn.name = name;
    }
    if (data.children) {
        assemble_node(scn, data.children);
    }
    return scn;
}

/**
 * @param {Node2D} node
 * @param {any} children
 */
function assemble_node(node, children) {
    if (!children || children.length === 0) {
        return;
    }

    let i, data, inst;
    for (i = 0; i < children.length; i++) {
        data = children[i];

        if (data.type === 'Scene') {
            let packed_scene = require(`scene/${data.key}.json`);
            if (packed_scene.class) {
                if (!scene_class_map[packed_scene.class]) {
                    throw `[Assemble] class of scene "${packed_scene.class}" is not defined!`;
                }
                inst = scene_class_map[packed_scene.class].instance();
            } else {
                inst = new (node_class_map[packed_scene.type])();

                inst._load_data(packed_scene);
                assemble_node(inst, packed_scene.children);
            }
        } else {
            inst = new (node_class_map[data.type])();
        }

        inst._load_data(data);
        assemble_node(inst, data.children);

        node.add_child(inst);
    }
}
