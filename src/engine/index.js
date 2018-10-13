// import polyfills. Done as an export to make sure polyfills are imported first
export * from './polyfill/index';

// Dependence
export * from 'engine/dep/index';

// Node
import Node2D from './scene/Node2D';

import Sprite from './scene/sprites/Sprite';
import AnimatedSprite from './scene/sprites/AnimatedSprite';
import TilingSprite from './scene/sprites/TilingSprite';
import NineSliceSprite from './scene/sprites/NineSliceSprite';
import CoaSprite from './scene/coa_sprite/CoaSprite';

import Graphics from './scene/graphics/Graphics';

import BitmapText from './scene/BitmapText';
import Text from './scene/text/Text';

import BackgroundMap from './scene/map/BackgroundMap';
import CollisionMap from './scene/map/CollisionMap';

import ParticleNode2D from './scene/particles/ParticleNode2D';

import Mesh from './scene/mesh/Mesh';
import Plane from './scene/mesh/Plane';
import NineslicePlane from './scene/mesh/NineslicePlane';
import Rope from './scene/mesh/Rope';

import Timer from './scene/Timer';

export {
    Node2D,

    Sprite,
    AnimatedSprite,
    TilingSprite,
    NineSliceSprite,
    CoaSprite,

    Graphics,

    BitmapText,
    Text,

    BackgroundMap,
    CollisionMap,

    ParticleNode2D,

    Mesh,
    Plane,
    NineslicePlane,
    Rope,

    Timer,
}

// Class
export { default as SpriteRenderer } from './scene/sprites/webgl/SpriteRenderer';
export { default as CanvasSpriteRenderer } from './scene/sprites/canvas/CanvasSpriteRenderer';

export { default as GraphicsRenderer } from './scene/graphics/webgl/GraphicsRenderer';
export { default as CanvasGraphicsRenderer } from './scene/graphics/canvas/CanvasGraphicsRenderer';

export { default as MeshRenderer } from './scene/mesh/webgl/MeshRenderer';

export { default as Texture } from './textures/Texture';
export { default as BaseTexture } from './textures/BaseTexture';
export { default as RenderTexture } from './textures/RenderTexture';
export { default as BaseRenderTexture } from './textures/BaseRenderTexture';
export { default as VideoBaseTexture } from './textures/VideoBaseTexture';
export { default as TextureUvs } from './textures/TextureUvs';
export { default as TextureMatrix } from './textures/TextureMatrix';

export { default as CanvasRenderTarget } from './renderers/canvas/utils/CanvasRenderTarget';

export { default as Shader } from './Shader';

export { default as WebGLManager } from './renderers/webgl/managers/WebGLManager';
export { default as ObjectRenderer } from './renderers/webgl/utils/ObjectRenderer';
export { default as RenderTarget } from './renderers/webgl/utils/RenderTarget';
export { default as Quad } from './renderers/webgl/utils/Quad';
export { default as SpriteMaskFilter } from './renderers/webgl/filters/sprite_mask/SpriteMaskFilter';
export { default as Filter } from './renderers/webgl/filters/Filter';

export { default as RectangleShape2D } from './scene/physics/RectangleShape2D';
export { default as Area2D } from './scene/physics/Area2D';
export { default as PhysicsBody2D } from './scene/physics/PhysicsBody2D';

export { default as Tween } from './anime/Tween';

export { default as Input } from './input/index';
export { default as SceneTree } from './SceneTree';

// Global constant, setting and function
import settings from './settings';
export * from './const';
export * from './math/index';
export * from './rnd';

// Namespace
import * as accessibility from './accessibility/index';
import * as audio from './audio/index';
import * as extract from './extract/index';
import * as filters from './filters/index';
import * as interaction from './interaction/index';
import * as loaders from './loaders/index';
import * as ticker from './ticker/index';
import * as utils from './utils/index';

export {
    settings,

    accessibility,
    audio,
    extract,
    filters,
    interaction,
    loaders,
    ticker,
    utils,
}

// Instances
import Input from './input/index';
import SceneTree from './SceneTree';

// Global instances
export const loader = loaders.shared || null;
export const input = new Input();
export const scene_tree = new SceneTree(input);
export const sound = audio.SoundLibrary.init(loaders.Resource, loaders.Loader, loader);

/**
 * @typedef PackedScene
 * @property {() => Node2D} instance
 */
/**
 * Scene class looking table
 * @type {Object<string, PackedScene>}}
 */
export const registered_scene_class = Object.create(null);

// TODO: move the table to somewhere else, and automatically insert the classes
//       while those classes is required
/**
 * Scene class looking table
 * @type {Object}
 */
export const registered_node_class = {
    Node2D,

    Sprite,
    AnimatedSprite,
    CoaSprite,
    TilingSprite,
    NineSliceSprite,

    Graphics,

    Text,
    BitmapText,

    BackgroundMap,
    CollisionMap,

    ParticleNode2D,

    Mesh,
    Plane,
    NineslicePlane,
    Rope,

    Timer,
};

// Functions
/**
 * Register scene class, for packed scene instancing process
 * @param {string} key  Key of the scene class
 * @param {PackedScene} ctor Class to be registered
 */
export function register_scene_class(key, ctor) {
    if (!registered_scene_class[key]) {
        registered_scene_class[key] = ctor;
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
                if (!registered_scene_class[packed_scene.class]) {
                    throw `[Assemble] class of scene "${packed_scene.class}" is not defined!`;
                }
                inst = registered_scene_class[packed_scene.class].instance();
            } else {
                inst = new (registered_node_class[packed_scene.type])();

                inst._load_data(packed_scene);
                assemble_node(inst, packed_scene.children);
            }
        } else {
            inst = new (registered_node_class[data.type])();
        }

        inst._load_data(data);
        assemble_node(inst, data.children);

        node.add_child(inst);
    }
}
