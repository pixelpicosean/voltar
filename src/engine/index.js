// ------------------------------------------------------------------
// Polyfills
// Done as an export to make sure polyfills are imported first.
// ------------------------------------------------------------------
export * from './polyfill/index';

// ------------------------------------------------------------------
// 3rd party libs
// ------------------------------------------------------------------
export * from 'engine/dep/index';

// ------------------------------------------------------------------
// Node
// ------------------------------------------------------------------
import Node2D from './scene/Node2D';

export { default as Node2D } from './scene/Node2D';

export { default as Sprite } from './scene/sprites/Sprite';
export { default as AnimatedSprite } from './scene/sprites/AnimatedSprite';
export { default as TilingSprite } from './scene/sprites/TilingSprite';
export { default as NineSliceSprite } from './scene/sprites/NineSliceSprite';

export { default as Control } from './scene/controls/Control';
export { default as ColorRect } from './scene/controls/ColorRect';
export { default as TextureRect } from './scene/controls/TextureRect';
export { default as NinePatchRect } from './scene/controls/NinePatchRect';
export { VBoxContainer, HBoxContainer } from './scene/controls/BoxContainer';
export { default as MarginContainer } from './scene/controls/MarginContainer';
export { default as CenterContainer } from './scene/controls/CenterContainer';

export { default as CutoutAnimation } from './scene/coa/CutoutAnimation';

export { default as Graphics } from './scene/graphics/Graphics';

export { default as BitmapText } from './scene/text/BitmapText';
export { default as Text } from './scene/text/Text';

export { default as BackgroundMap } from './scene/map/BackgroundMap';
export { default as CollisionMap } from './scene/map/CollisionMap';

export { default as ParticleNode2D } from './scene/particles/ParticleNode2D';

export { default as Mesh } from './scene/mesh/Mesh';
export { default as Plane } from './scene/mesh/Plane';
export { default as NineSlicePlane } from './scene/mesh/NineSlicePlane';
export { default as Rope } from './scene/mesh/Rope';

export { default as Area2D } from './scene/physics/Area2D';
export { default as RigidBody2D } from './scene/physics/RigidBody2D';
export { default as KinematicBody2D } from './scene/physics/KinematicBody2D';
export { default as StaticBody2D } from './scene/physics/StaticBody2D';

export { default as Timer } from './scene/Timer';

export { default as AnimationPlayer } from './scene/animation/AnimationPlayer';

// ------------------------------------------------------------------
// Useful class
// ------------------------------------------------------------------
export { default as Color } from './Color';

export { default as TextureUvs } from './textures/TextureUvs';
export { default as TextureMatrix } from './textures/TextureMatrix';

export { default as BaseTexture } from './textures/BaseTexture';
export { default as Texture } from './textures/Texture';

export { default as BaseRenderTexture } from './textures/BaseRenderTexture';
export { default as RenderTexture } from './textures/RenderTexture';

export { default as VideoBaseTexture } from './textures/VideoBaseTexture';

export { default as RectangleShape2D } from './scene/physics/RectangleShape2D';

// ------------------------------------------------------------------
// Global constant, setting and function
// ------------------------------------------------------------------
import settings from './settings';
export * from './const';
export * from './math/index';
export * from './rnd';

// ------------------------------------------------------------------
// Namespace
// ------------------------------------------------------------------
import * as utils from './utils/index';
import * as loaders from './loaders/index';
import * as ticker from './ticker/index';
import * as audio from './audio/index';

export {
    settings,

    utils,

    loaders,
    ticker,
    audio,
}

// ------------------------------------------------------------------
// Instances
// ------------------------------------------------------------------
import Input from './input/index';
import SceneTree from './SceneTree';

/** @type {Array<Array<string>>} */
const preload_queue = [];

export const input = new Input();
export const scene_tree = new SceneTree(input, preload_queue);
export const sound = audio.SoundLibrary.init();

// ------------------------------------------------------------------
// Global functions
// ------------------------------------------------------------------
/**
 * Preload a resource before game start
 */
export function preload(...settings) {
    preload_queue.push(settings);
}

import {
    node_class_map,
    scene_class_map,
    res_class_map,
} from 'engine/registry';

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
            if (data._is_proxy_) {
                inst = new (res_class_map[data.prop_value.type])()._load_data(data.prop_value);
            } else {
                inst = new (node_class_map[data.type])()._load_data(data);
            }
        }

        if (data._is_proxy_) {
            node[`add_${data.prop_key}`](inst);
        } else {
            assemble_node(inst, data.children);
            node.add_child(inst);
        }
    }
}
