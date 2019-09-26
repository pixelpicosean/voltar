// ------------------------------------------------------------------
// 3rd party libs
// ------------------------------------------------------------------
export * from 'engine/dep/index';

// ------------------------------------------------------------------
// Core
// ------------------------------------------------------------------
export * from 'engine/core/v_array';
export * from 'engine/core/v_map';
export * from 'engine/core/v_object';

export * from 'engine/core/math/convex';
export * from 'engine/core/math/geometry';
export * from 'engine/core/math/math_defs';
export * from 'engine/core/math/math_funcs';
export * from 'engine/core/math/vector2';
export * from 'engine/core/math/rect2';
export * from 'engine/core/math/transform_2d';
export * from 'engine/core/color';
export * from 'engine/core/self_list';

export { _yield as yield } from 'engine/core/yield';

export * from 'engine/utils/c';
export * from 'engine/utils/color';
export * from 'engine/utils/deep_merge';
export * from 'engine/utils/mixin';
export * from 'engine/utils/trim_canvas';

// ------------------------------------------------------------------
// Resource
// ------------------------------------------------------------------
export * from 'engine/core/resource';
export * from 'engine/core/image';
export * from 'engine/core/os/input_event';
export * from 'engine/core/os/keyboard';
// export * from 'engine/scene/resources/tile_set';
export * from 'engine/scene/resources/texture';
export * from 'engine/scene/resources/shape_2d';
export * from 'engine/scene/resources/segment_shape_2d';
export * from 'engine/scene/resources/circle_shape_2d';
export * from 'engine/scene/resources/rectangle_shape_2d';
export * from 'engine/scene/resources/convex_polygon_shape_2d';
export * from 'engine/scene/resources/physics_material';
export * from 'engine/scene/resources/space_2d';
export * from 'engine/scene/resources/world_2d';
export * from 'engine/scene/resources/font';
export * from 'engine/scene/resources/style_box';
export * from 'engine/scene/resources/theme';
export * from 'engine/scene/resources/curve';

// ------------------------------------------------------------------
// Node
// ------------------------------------------------------------------
export * from 'engine/scene/main/node';
export * from 'engine/scene/main/viewport';
export * from 'engine/scene/main/canvas_layer';
export * from 'engine/scene/main/scene_tree';

export * from 'engine/scene/animation/animation_player';

export * from 'engine/scene/2d/const';
export * from 'engine/scene/2d/canvas_item';
export * from 'engine/scene/2d/node_2d';
export * from 'engine/scene/2d/sprite';
export * from 'engine/scene/2d/path_2d';
export * from 'engine/scene/2d/cpu_particles_2d';

export * from 'engine/scene/2d/collision_object_2d';
export * from 'engine/scene/2d/collision_shape_2d';
export * from 'engine/scene/2d/collision_polygon_2d';
export * from 'engine/scene/2d/area_2d';
export * from 'engine/scene/2d/physics_body_2d';
export * from 'engine/scene/2d/ray_cast_2d';

export * from 'engine/scene/2d/camera_2d';
export * from 'engine/scene/2d/visibility_notifier_2d';
export * from 'engine/scene/2d/parallax_background';
export * from 'engine/scene/2d/parallax_layer';
export * from 'engine/scene/2d/y_sort';
export * from 'engine/scene/2d/remote_transform_2d';

export * from 'engine/scene/gui/const';
export * from 'engine/scene/gui/color_rect';
export * from 'engine/scene/gui/texture_rect';
export * from 'engine/scene/gui/nine_patch_rect';
export * from 'engine/scene/gui/container';
export * from 'engine/scene/gui/margin_container';
export * from 'engine/scene/gui/center_container';
export * from 'engine/scene/gui/box_container';
export * from 'engine/scene/gui/grid_container';
export * from 'engine/scene/gui/label';
export * from 'engine/scene/gui/base_button';
export * from 'engine/scene/gui/texture_button';
export * from 'engine/scene/gui/range';
export * from 'engine/scene/gui/texture_progress';

export * from 'engine/registry';

// ------------------------------------------------------------------
// Singletons
// ------------------------------------------------------------------
export * from 'engine/core/project_settings';
export * from 'engine/main/main';

import { Main } from 'engine/main/main';

import { Input as Input_t } from 'engine/main/input';
import { InputMap as InputMap_t } from 'engine/core/input_map';
import { OS as OS_t } from 'engine/core/os/os';
import { MessageQueue as MessageQueue_t } from 'engine/core/message_queue';
import { Engine as Engine_t} from 'engine/core/engine';
import { VisualServer as VisualServer_t } from 'engine/servers/visual_server';
import { Physics2DServer as Physics2DServer_t } from 'engine/servers/physics_2d/physics_2d_server';
import { SceneTree as SceneTree_t } from 'engine/scene/main/scene_tree';

export { VSG } from 'engine/servers/visual/visual_server_globals';

/** @type {Input_t} */
export let Input = null;

/** @type {InputMap_t} */
export let InputMap = null;

/** @type {OS_t} */
export let OS = null;

/** @type {MessageQueue_t} */
export let MessageQueue = null;

/** @type {Engine_t} */
export let Engine = null;

/** @type {VisualServer_t} */
export let VisualServer = null;

/** @type {Physics2DServer_t} */
export let Physics2DServer = null;

/** @type {SceneTree_t} */
export let SceneTree = null;

Main.events.connect_once('started', () => {
    Input = Input_t.get_singleton();
    InputMap = InputMap_t.get_singleton();
    OS = OS_t.get_singleton();
    MessageQueue = MessageQueue_t.get_singleton();
    Engine = Engine_t.get_singleton();
    VisualServer = VisualServer_t.get_singleton();
    Physics2DServer = Physics2DServer_t.get_singleton();
    SceneTree = SceneTree_t.get_singleton();
})

// ------------------------------------------------------------------
// Resource loading functions
// ------------------------------------------------------------------
import { ResourceLoader } from './core/io/resource_loader';
import {
    scene_class_map,
    resource_map,
    preload_queue,
} from './registry';

/**
 * Preload a resource before game start.
 * @param {...(string|Object)} settings
 */
export function preload(...settings) {
    if (!preload_queue.is_start && preload_queue.is_complete) {
        throw new Error('"preload" can only be called before launch!');
    }
    preload_queue.queue.push(settings);
}

/**
 * @param  {...(string | Object)} settings
 */
export function load(...settings) {
    return new ResourceLoader().add(...settings).load();
}

/**
 * Get the data from resource url
 * @param {string} url
 */
export function get_resource(url) {
    return resource_map[url];
}

// ------------------------------------------------------------------
// Node assemble functions
// ------------------------------------------------------------------
export * from 'engine/scene/assembler';

/**
 * Get the packed scene class or data
 * @param {string} url
 */
export function get_packed_scene(url) {
    return scene_class_map[url] || resource_map[url];
}
