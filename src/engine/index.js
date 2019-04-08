// ------------------------------------------------------------------
// 3rd party libs
// ------------------------------------------------------------------
export * from 'engine/dep/index';

export { default as VObject } from 'engine/core/v_object';

// ------------------------------------------------------------------
// Node
// ------------------------------------------------------------------
import Node2D from 'engine/scene/node_2d';
export { PauseMode } from 'engine/scene/node_2d';

export { default as Viewport } from 'engine/scene/main/viewport';
export { default as CanvasLayer } from 'engine/scene/main/canvas_layer';

export { default as Node2D } from 'engine/scene/node_2d';

export { default as Sprite } from 'engine/scene/sprites/sprite';
export { default as AnimatedSprite } from 'engine/scene/sprites/animated_sprite';
export { default as TilingSprite } from 'engine/scene/sprites/tiling_sprite';
export { default as NineSliceSprite } from 'engine/scene/sprites/nine_slice_sprite';

export { default as Control } from 'engine/scene/controls/control';
export { default as Container } from 'engine/scene/controls/container';
export { default as Label } from 'engine/scene/controls/label';
export { default as ColorRect } from 'engine/scene/controls/color_rect';
export { default as TextureRect } from 'engine/scene/controls/texture_rect';
export { default as NinePatchRect } from 'engine/scene/controls/nine_patch_rect';
export { default as TextureButton } from 'engine/scene/controls/texture_button';
export { default as TextureProgress } from 'engine/scene/controls/texture_progress';
export { default as MarginContainer } from 'engine/scene/controls/margin_container';
export { default as CenterContainer } from 'engine/scene/controls/center_container';
export { VBoxContainer, HBoxContainer } from 'engine/scene/controls/box_container';
export { default as GridContainer } from 'engine/scene/controls/grid_container';

export { default as Graphics } from 'engine/scene/graphics/graphics';

export { default as BitmapText } from 'engine/scene/text/bitmap_text';
export { default as Text } from 'engine/scene/text/text';

export { default as TileMap } from 'engine/scene/map/tile_map';

export { default as CPUParticles2D } from 'engine/scene/cpu_particles_2d';

export { default as Mesh } from 'engine/scene/mesh/mesh';
export { default as Plane } from 'engine/scene/mesh/plane';
export { default as NineSlicePlane } from 'engine/scene/mesh/nine_slice_plane';
export { default as Rope } from 'engine/scene/mesh/rope';

export { default as Area2D } from 'engine/scene/physics/area_2d';
export {
    StaticBody2D,
    KinematicBody2D, KinematicCollision2D,
} from 'engine/scene/physics/physics_body_2d';
export { default as RayCast2D } from 'engine/scene/physics/ray_cast_2d';

export { default as CollisionShape2D } from 'engine/scene/physics/collision_shape_2d';
export { default as CollisionPolygon2D } from 'engine/scene/physics/collision_polygon_2d';

export { RayShape2D, SegmentShape2D } from 'engine/scene/resources/segment_shape_2d';
export { default as CircleShape2D } from 'engine/scene/resources/circle_shape_2d';
export { default as RectangleShape2D } from 'engine/scene/resources/rectangle_shape_2d';
export { default as ConvexPolygonShape2D } from 'engine/scene/resources/convex_polygon_shape_2d';

export {
    RayResult,
} from 'engine/servers/physics_2d/state';

export { Path2D, PathFollow2D } from 'engine/scene/path_2d';

export { default as AnimationPlayer } from 'engine/scene/animation/animation_player';

export { default as RemoteTransform2D } from 'engine/scene/remote_transform_2d';
export { default as YSort } from 'engine/scene/y_sort';

export {
    VisibilityNotifier2D,
    VisibilityEnabler2D,
} from 'engine/scene/visibility_notifier_2d';

export { ParallaxBackground } from 'engine/scene/parallax_background';
export { ParallaxLayer } from 'engine/scene/parallax_layer';

export { default as Camera2D } from 'engine/scene/camera_2d';
export { default as Timer } from 'engine/scene/timer';

export { default as InteractionEvent } from 'engine/interaction/InteractionEvent';

export { default as Loader } from 'engine/core/io/Loader';
export { default as Resource } from 'engine/core/io/Resource';

// ------------------------------------------------------------------
// Useful class
// ------------------------------------------------------------------
export { default as OS } from 'engine/core/os';

export { default as Color } from 'engine/core/color';
export { Curve, Curve2D } from 'engine/scene/resources/curve';

export { default as TweenManager } from 'engine/tween/tween_manager';

export { default as TextureUvs } from 'engine/scene/resources/textures/texture_uvs';
export { default as TextureMatrix } from 'engine/scene/resources/textures/texture_matrix';

export { default as BaseTexture } from 'engine/scene/resources/textures/base_texture';
export { default as Texture } from 'engine/scene/resources/textures/texture';

export { default as BaseRenderTexture } from 'engine/scene/resources/textures/base_render_texture';
export { default as RenderTexture } from 'engine/scene/resources/textures/render_texture';

export { default as VideoBaseTexture } from 'engine/scene/resources/textures/video_base_texture';

// ------------------------------------------------------------------
// Global constant, setting and function
// ------------------------------------------------------------------
import settings from 'engine/settings';
export * from 'engine/const';
export * from 'engine/core/math/index';
export * from 'engine/core/math/random_pcg';
export { default as yield } from 'engine/core/yield';

// ------------------------------------------------------------------
// Namespace
// ------------------------------------------------------------------
import * as utils from 'engine/utils/index';
import * as ticker from 'engine/ticker/index';
import * as audio from 'engine/audio/index';
import * as filters from 'engine/filters/index';

export { registered_bitmap_fonts as bitmap_fonts } from 'engine/scene/text/res';

export {
    settings,

    utils,

    ticker,
    audio,
    filters,
}

// ------------------------------------------------------------------
// Instances
// ------------------------------------------------------------------
import Input from 'engine/input/index';
import SceneTree from 'engine/scene/main/scene_tree';
import Loader from 'engine/core/io/Loader';

import resource_map from 'resources.json';

const preload_queue = {
    is_complete: false,
    /** @type {(string|Object)[][]} */
    queue: [],
};

export const input = new Input();
export const scene_tree = new SceneTree(input, preload_queue, resource_map);
export const sound = audio.SoundLibrary.init();

/**
 * Get the data from resource url
 * @param {string} url
 */
export function get_resource(url) {
    return resource_map[url];
}

/**
 * Get the packed scene class or data
 * @param {string} url
 */
export function get_packed_scene(url) {
    return scene_class_map[url] || resource_map[url];
}

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
 */
export function attach_script(url, scene) {
    // Add `instance` static method
    scene.instance = () => {
        return assemble_scene(new scene(), resource_map[url]);
    };

    // Register as scene
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
 * Assemble a scene(Node2D) with hierarchy data
 * @template {Node2D} T
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

    return scn;
}

/**
 * @template {Node2D} T
 * @param {NodeData | typeof Node2D} p_data
 */
export function instanciate_scene(p_data) {
    /** @type {NodeData} */
    let data = null;
    /** @type {typeof Node2D} */
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

    return inst;
}

/**
 * @template {Node2D} T
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
