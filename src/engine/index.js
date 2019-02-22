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

export { default as Viewport } from './scene/main/viewport';
export { default as CanvasLayer } from './scene/main/canvas_layer';

export { default as Node2D } from './scene/Node2D';

export { default as Sprite } from './scene/sprites/Sprite';
export { default as AnimatedSprite } from './scene/sprites/AnimatedSprite';
export { default as TilingSprite } from './scene/sprites/TilingSprite';
export { default as NineSliceSprite } from './scene/sprites/NineSliceSprite';

export { default as Control } from './scene/controls/Control';
export { default as Container } from './scene/controls/Container';
export { default as Label } from './scene/controls/Label';
export { default as ColorRect } from './scene/controls/ColorRect';
export { default as TextureRect } from './scene/controls/TextureRect';
export { default as NinePatchRect } from './scene/controls/NinePatchRect';
export { default as TextureButton } from './scene/controls/TextureButton';
export { default as TextureProgress } from './scene/controls/TextureProgress';
export { default as MarginContainer } from './scene/controls/MarginContainer';
export { default as CenterContainer } from './scene/controls/CenterContainer';
export { VBoxContainer, HBoxContainer } from './scene/controls/BoxContainer';
export { default as GridContainer } from './scene/controls/GridContainer';

export { default as Graphics } from './scene/graphics/Graphics';

export { default as BitmapText } from './scene/text/BitmapText';
export { default as Text } from './scene/text/Text';

export { default as TileMap } from './scene/map/tile_map';

export { default as CPUParticles2D } from './scene/cpu_particles_2d';

export { default as Mesh } from './scene/mesh/Mesh';
export { default as Plane } from './scene/mesh/Plane';
export { default as NineSlicePlane } from './scene/mesh/NineSlicePlane';
export { default as Rope } from './scene/mesh/Rope';

export { default as Area2D } from './scene/physics/area_2d';
export {
    StaticBody2D,
    KinematicBody2D, KinematicCollision2D,
} from './scene/physics/physics_body_2d';
export { default as RayCast2D } from './scene/physics/ray_cast_2d';

export { default as CollisionShape2D } from './scene/physics/collision_shape_2d';
export { default as CollisionPolygon2D } from './scene/physics/collision_polygon_2d';

export { RayShape2D, SegmentShape2D } from './scene/resources/segment_shape_2d';
export { default as CircleShape2D } from './scene/resources/circle_shape_2d';
export { default as RectangleShape2D } from './scene/resources/rectangle_shape_2d';
export { default as ConvexPolygonShape2D } from './scene/resources/convex_polygon_shape_2d';

export {
    RayResult,
} from './servers/physics_2d/state';

export { Path2D, PathFollow2D } from './scene/path_2d';

export { default as AnimationPlayer } from './scene/animation/AnimationPlayer';

export { default as RemoteTransform2D } from './scene/remote_transform_2d';
export { default as YSort } from './scene/y_sort';

export {
    VisibilityNotifier2D,
    VisibilityEnabler2D,
} from './scene/visibility_notifier_2d';

export { default as Camera2D } from './scene/camera_2d';
export { default as Timer } from './scene/Timer';

export { default as InteractionEvent } from './interaction/InteractionEvent';

export { default as Loader } from 'engine/core/io/Loader';
export { default as Resource } from 'engine/core/io/Resource';

// ------------------------------------------------------------------
// Useful class
// ------------------------------------------------------------------
export { default as OS } from './core/os';

export { default as Color } from './Color';
export { Curve, Curve2D } from './scene/resources/curve';

export { default as TextureUvs } from './textures/TextureUvs';
export { default as TextureMatrix } from './textures/TextureMatrix';

export { default as BaseTexture } from './textures/BaseTexture';
export { default as Texture } from './textures/Texture';

export { default as BaseRenderTexture } from './textures/BaseRenderTexture';
export { default as RenderTexture } from './textures/RenderTexture';

export { default as VideoBaseTexture } from './textures/VideoBaseTexture';

// ------------------------------------------------------------------
// Global constant, setting and function
// ------------------------------------------------------------------
import settings from './settings';
export * from './const';
export * from './math/index';
export * from './rnd';
export { default as yield } from './core/yield';

// ------------------------------------------------------------------
// Namespace
// ------------------------------------------------------------------
import * as utils from './utils/index';
import * as ticker from './ticker/index';
import * as audio from './audio/index';

export { registered_bitmap_fonts as bitmap_fonts } from './scene/text/res';

export {
    settings,

    utils,

    ticker,
    audio,
}

// ------------------------------------------------------------------
// Instances
// ------------------------------------------------------------------
import Input from './input/index';
import SceneTree from './scene/main/scene_tree';
import Loader from './core/io/Loader';

import resource_map from 'resources.json';

const preload_queue = {
    is_complete: false,
    /** @type {(string|Object)[][]} */
    queue: [],
};

export const input = new Input();
export const scene_tree = new SceneTree(input, preload_queue, resource_map);
export const sound = audio.SoundLibrary.init();

// ------------------------------------------------------------------
// Global functions
// ------------------------------------------------------------------
/**
 * Preload a resource before game start.
 * @param {...(string|Object)} settings
 */
export function preload(...settings) {
    if (preload_queue.is_complete) {
        throw new Error('"preload" can only be called before launch!');
    }
    preload_queue.queue.push(settings);
}

/**
 * Add a new resource loading to the queue and load. A new loading process will be
 * used while other resources are also loading right now.
 * @param {...(string|Object)} settings
 */
export function load(...settings) {
    if (!preload_queue.is_complete) {
        throw new Error('Use "preload" if you want to load assets before launch.');
    }

    const loader = scene_tree.loader;

    // Load by the main loader
    if (!loader.loading) {
        return loader.add(...settings).load();
    }

    // Load by a new loader instance
    console.warn('Start a new loading process since other resources are loading!');
    return new Loader().add(...settings).load();
}

import {
    node_class_map,
    scene_class_map,
    res_class_map,
} from 'engine/registry';

const has = Object.prototype.hasOwnProperty;

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
 * @param {String} url path to the scene (JSON from .tscn)
 * @param {typeof Node2D} scene Scene class
 * @returns {typeof Node2D}
 */
export function attach_script(url, scene) {
    // Add `instance` static method
    scene['instance'] = () => {
        return assemble_scene(new scene(), resource_map[url]);
    };

    // @ts-ignore
    // Register as scene
    register_scene_class(url, scene);

    return scene;
}

/**
 * Assemble a scene(Node2D) with hierarchy data
 * @param {Node2D} scn
 * @param {any} data data
 * @returns {Node2D}
 */
export function assemble_scene(scn, data) {
    scn._load_data(data);
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
            // Scene data (converted from ".tscn")
            const packed_scene = resource_map[data.filename];

            // Let's see whether it is registered
            const scene_class = has.call(scene_class_map, data.filename) ? scene_class_map[data.filename] : undefined;

            // Custom scene class?
            if (scene_class) {
                inst = scene_class.instance();
            }
            // Or we simply create it as a "collapsed scene tree"
            else {
                inst = new (node_class_map[packed_scene.type])();

                // Create child nodes
                assemble_node(inst, packed_scene.children);
            }

            // Load scene's local data
            inst._load_data(packed_scene);

            // Load override data from parent scene
            inst._load_data(data);
        } else {
            if (data._is_proxy_) {
                if (res_class_map.hasOwnProperty(data.prop_value.type)) {
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
            assemble_node(inst, data.children);
            node.add_child(inst);
        }
    }
}
