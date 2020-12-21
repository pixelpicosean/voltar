// ------------------------------------------------------------------
// 3rd party libs
// ------------------------------------------------------------------
export * from 'engine/dep/index.ts';

// ------------------------------------------------------------------
// Core
// ------------------------------------------------------------------
export * from 'engine/core/v_array.js';
export * from 'engine/core/v_object.js';

export * from 'engine/core/math/convex.js';
export * from 'engine/core/math/geometry.js';
export * from 'engine/core/math/math_defs.js';
export * from 'engine/core/math/math_funcs.js';
export * from 'engine/core/math/vector2.js';
export * from 'engine/core/math/vector3.js';
export * from 'engine/core/math/pool_vector2_array.js';
export * from 'engine/core/math/rect2.js';
export * from 'engine/core/math/aabb.js';
export * from 'engine/core/math/transform_2d.js';
export * from 'engine/core/math/camera_matrix.js';
export * from 'engine/core/math/convex.js';
export * from 'engine/core/math/octree.js';
export * from 'engine/core/math/plane.js';
export * from 'engine/core/math/basis.js';
export * from 'engine/core/math/transform.js';
export * from 'engine/core/color.js';
export * from 'engine/core/math/pool_color_array.js';
export * from 'engine/core/self_list.js';


export {
    _yield as yield,
    _yield_ex as yield_ex
} from 'engine/core/yield.js';

export * from 'engine/utils/c';
export * from 'engine/utils/color';
export * from 'engine/utils/deep_merge';
export * from 'engine/utils/mixin';
export * from 'engine/utils/trim_canvas';

// ------------------------------------------------------------------
// Resource
// ------------------------------------------------------------------
export * from 'engine/core/resource.js';
export * from 'engine/core/os/input_event.js';
export * from 'engine/core/os/keyboard.js';
export * from 'engine/scene/resources/tile_set.js';
export * from 'engine/scene/resources/texture.js';
export * from 'engine/scene/resources/shape_2d.js';
export * from 'engine/scene/resources/segment_shape_2d.js';
export * from 'engine/scene/resources/circle_shape_2d.js';
export * from 'engine/scene/resources/rectangle_shape_2d.js';
export * from 'engine/scene/resources/capsule_shape_2d.js';
export * from 'engine/scene/resources/convex_polygon_shape_2d.js';
export * from 'engine/scene/resources/physics_material.js';
export * from 'engine/scene/resources/space_2d.js';
export * from 'engine/scene/resources/world_2d.js';
export * from 'engine/scene/resources/font.js';
export * from 'engine/scene/resources/style_box.js';
export * from 'engine/scene/resources/theme.js';
export * from 'engine/scene/resources/curve.js';
export * from 'engine/scene/resources/material.js';
export * from 'engine/scene/resources/mesh.js';
export * from 'engine/scene/resources/skin.js';
export * from 'engine/scene/resources/sky.js';
export * from 'engine/scene/resources/primitive_meshes.js';
export * from 'engine/scene/resources/world.js';

// ------------------------------------------------------------------
// Node
// ------------------------------------------------------------------
export * from 'engine/scene/main/node.js';
export * from 'engine/scene/main/viewport.js';
export * from 'engine/scene/main/canvas_layer.js';
export * from 'engine/scene/main/scene_tree.js';
export * from 'engine/scene/main/timer.js';

export * from 'engine/scene/animation/animation_player.js';

export * from 'engine/scene/2d/const';
export * from 'engine/scene/2d/canvas_item.js';
export * from 'engine/scene/2d/node_2d.js';
export * from 'engine/scene/2d/sprite.js';
export * from 'engine/scene/2d/animated_sprite.js';
export * from 'engine/scene/2d/path_2d.js';
export * from 'engine/scene/2d/cpu_particles_2d.js';
export * from 'engine/scene/2d/polygon_2d.js';

export * from 'engine/scene/2d/collision_object_2d.js';
export * from 'engine/scene/2d/collision_shape_2d.js';
export * from 'engine/scene/2d/collision_polygon_2d.js';
export * from 'engine/scene/2d/area_2d.js';
export * from 'engine/scene/2d/physics_body_2d.js';
export * from 'engine/scene/2d/ray_cast_2d.js';

export * from 'engine/scene/2d/camera_2d.js';
export * from 'engine/scene/2d/visibility_notifier_2d.js';
export * from 'engine/scene/2d/tile_map.js';
export * from 'engine/scene/2d/parallax_background.js';
export * from 'engine/scene/2d/parallax_layer.js';
export * from 'engine/scene/2d/y_sort.js';
export * from 'engine/scene/2d/remote_transform_2d.js';

export * from 'engine/scene/gui/const';
export * from 'engine/scene/gui/control.js';
export * from 'engine/scene/gui/color_rect.js';
export * from 'engine/scene/gui/texture_rect.js';
export * from 'engine/scene/gui/nine_patch_rect.js';
export * from 'engine/scene/gui/container.js';
export * from 'engine/scene/gui/margin_container.js';
export * from 'engine/scene/gui/center_container.js';
export * from 'engine/scene/gui/box_container.js';
export * from 'engine/scene/gui/grid_container.js';
export * from 'engine/scene/gui/label.js';
export * from 'engine/scene/gui/base_button.js';
export * from 'engine/scene/gui/texture_button.js';
export * from 'engine/scene/gui/range.js';
export * from 'engine/scene/gui/texture_progress.js';

export * from 'engine/scene/3d/spatial.js';
export * from 'engine/scene/3d/camera.js';
export * from 'engine/scene/3d/visual_instance.js';
export * from 'engine/scene/3d/mesh_instance.js';
export * from 'engine/scene/3d/light.js';
export * from 'engine/scene/3d/skeleton.js';

export * from 'engine/registry';

// ------------------------------------------------------------------
// Singletons
// ------------------------------------------------------------------
export * from 'engine/core/project_settings.js';
export * from 'engine/main/main.js';

import { Main } from 'engine/main/main.js';

import { Input as Input_t } from 'engine/main/input.js';
import { InputMap as InputMap_t } from 'engine/core/input_map.js';
import { OS as OS_t } from 'engine/core/os/os.js';
import { ProjectSettings as ProjectSettings_t } from 'engine/core/project_settings.js';
import { MessageQueue as MessageQueue_t } from 'engine/core/message_queue.js';
import { Engine as Engine_t } from 'engine/core/engine.js';
import { VisualServer as VisualServer_t } from 'engine/servers/visual_server.js';
import { Physics2DServer as Physics2DServer_t } from 'engine/servers/physics_2d/physics_2d_server.js';
import { SceneTree as SceneTree_t } from 'engine/scene/main/scene_tree.js';
import { AudioServer as AudioServer_t } from 'engine/audio/audio.js';

export { VSG } from 'engine/servers/visual/visual_server_globals.js';

/** @type {Input_t} */
export let Input = null;

/** @type {InputMap_t} */
export let InputMap = null;

/** @type {OS_t} */
export let OS = null;

/** @type {ProjectSettings_t} */
export let ProjectSettings = null;

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

/** @type {AudioServer_t} */
export let Audio = null;

Main.events.connect_once('started', () => {
    Input = Input_t.get_singleton();
    InputMap = InputMap_t.get_singleton();
    OS = OS_t.get_singleton();
    ProjectSettings = ProjectSettings_t.get_singleton();
    MessageQueue = MessageQueue_t.get_singleton();
    Engine = Engine_t.get_singleton();
    VisualServer = VisualServer_t.get_singleton();
    Physics2DServer = Physics2DServer_t.get_singleton();
    SceneTree = SceneTree_t.get_singleton();
    Audio = AudioServer_t.get_singleton();
})

// ------------------------------------------------------------------
// Resource loading functions
// ------------------------------------------------------------------
import { ResourceLoader } from './core/io/resource_loader.js';
import {
    scene_class_map,
    get_resource_map,
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
    // @ts-ignore
    return new ResourceLoader().add(...settings).load();
}

/**
 * Get the data from resource url
 * @param {string} url
 */
export function get_resource(url) {
    return get_resource_map()[url];
}

// ------------------------------------------------------------------
// Node assemble functions
// ------------------------------------------------------------------
export * from 'engine/scene/assembler.js';

/**
 * Get the packed scene class or data
 * @param {string} url
 */
export function get_packed_scene(url) {
    return get_resource_map()[url];
}
