// ------------------------------------------------------------------
// 3rd party libs
// ------------------------------------------------------------------
export * from 'engine/dep/index';

// ------------------------------------------------------------------
// Core
// ------------------------------------------------------------------
export * from 'engine/core/v_array';
export * from 'engine/core/v_object';

export * from 'engine/core/math/convex';
export * from 'engine/core/math/geometry';
export * from 'engine/core/math/math_defs';
export * from 'engine/core/math/math_funcs';
export * from 'engine/core/math/vector2';
export * from 'engine/core/math/vector3';
export * from 'engine/core/math/pool_vector2_array';
export * from 'engine/core/math/rect2';
export * from 'engine/core/math/aabb';
export * from 'engine/core/math/transform_2d';
export * from 'engine/core/math/camera_matrix';
export * from 'engine/core/math/convex';
export * from 'engine/core/math/octree';
export * from 'engine/core/math/plane';
export * from 'engine/core/math/basis';
export * from 'engine/core/math/transform';
export * from 'engine/core/color';
export * from 'engine/core/math/pool_color_array';
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
export * from 'engine/core/os/input_event';
export * from 'engine/core/os/keyboard';
export * from 'engine/scene/resources/tile_set';
export * from 'engine/scene/resources/texture';
export * from 'engine/scene/resources/shape_2d';
export * from 'engine/scene/resources/segment_shape_2d';
export * from 'engine/scene/resources/circle_shape_2d';
export * from 'engine/scene/resources/rectangle_shape_2d';
export * from 'engine/scene/resources/capsule_shape_2d';
export * from 'engine/scene/resources/convex_polygon_shape_2d';
export * from 'engine/scene/resources/physics_material';
export * from 'engine/scene/resources/space_2d';
export * from 'engine/scene/resources/world_2d';
export * from 'engine/scene/resources/font';
export * from 'engine/scene/resources/style_box';
export * from 'engine/scene/resources/theme';
export * from 'engine/scene/resources/curve';
export * from 'engine/scene/resources/material';
export * from 'engine/scene/resources/mesh';
export * from 'engine/scene/resources/skin';
export * from 'engine/scene/resources/sky';
export * from 'engine/scene/resources/primitive_meshes';
export * from 'engine/scene/resources/world';

// ------------------------------------------------------------------
// Node
// ------------------------------------------------------------------
export * from 'engine/scene/main/node';
export * from 'engine/scene/main/viewport';
export * from 'engine/scene/main/canvas_layer';
export * from 'engine/scene/main/scene_tree';
export * from 'engine/scene/main/timer';

export * from 'engine/scene/animation/animation_player';

export * from 'engine/scene/2d/const';
export * from 'engine/scene/2d/canvas_item';
export * from 'engine/scene/2d/node_2d';
export * from 'engine/scene/2d/sprite';
export * from 'engine/scene/2d/animated_sprite';
export * from 'engine/scene/2d/path_2d';
export * from 'engine/scene/2d/cpu_particles_2d';
export * from 'engine/scene/2d/polygon_2d';

export * from 'engine/scene/2d/collision_object_2d';
export * from 'engine/scene/2d/collision_shape_2d';
export * from 'engine/scene/2d/collision_polygon_2d';
export * from 'engine/scene/2d/area_2d';
export * from 'engine/scene/2d/physics_body_2d';
export * from 'engine/scene/2d/ray_cast_2d';

export * from 'engine/scene/2d/camera_2d';
export * from 'engine/scene/2d/visibility_notifier_2d';
export * from 'engine/scene/2d/tile_map';
export * from 'engine/scene/2d/parallax_background';
export * from 'engine/scene/2d/parallax_layer';
export * from 'engine/scene/2d/y_sort';
export * from 'engine/scene/2d/remote_transform_2d';

export * from 'engine/scene/gui/const';
export * from 'engine/scene/gui/control';
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

export * from 'engine/scene/3d/spatial';
export * from 'engine/scene/3d/camera';
export * from 'engine/scene/3d/visual_instance';
export * from 'engine/scene/3d/mesh_instance';
export * from 'engine/scene/3d/light';
export * from 'engine/scene/3d/skeleton';
export * from 'engine/scene/3d/world_environment';
export * from 'engine/scene/3d/baked_lightmap';

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
import { ProjectSettings as ProjectSettings_t } from 'engine/core/project_settings';
import { MessageQueue as MessageQueue_t } from 'engine/core/message_queue';
import { Engine as Engine_t } from 'engine/core/engine';
import { VisualServer as VisualServer_t } from 'engine/servers/visual_server';
import { Physics2DServer as Physics2DServer_t } from 'engine/servers/physics_2d/physics_2d_server';
import { SceneTree as SceneTree_t } from 'engine/scene/main/scene_tree';
import { AudioServer as AudioServer_t } from 'engine/audio/audio.js';

export { VSG } from 'engine/servers/visual/visual_server_globals';

export let Input: Input_t = null;

export let InputMap: InputMap_t = null;

export let OS: OS_t = null;

export let ProjectSettings: ProjectSettings_t = null;

export let MessageQueue: MessageQueue_t = null;

export let Engine: Engine_t = null;

export let VisualServer: VisualServer_t = null;

export let Physics2DServer: Physics2DServer_t = null;

export let SceneTree: SceneTree_t = null;

export let Audio: AudioServer_t = null;

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
    get_resource_map,
    preload_queue,
} from './registry';

/**
 * Preload a resource before game start.
 */
export function preload(...settings: (string | object)[]) {
    if (!preload_queue.is_start && preload_queue.is_complete) {
        throw new Error('"preload" can only be called before launch!');
    }
    preload_queue.queue.push(settings);
}

/**
 * @param  {...(string | Object)} settings
 */
export function load(...settings: (string | object)[]) {
    // @ts-ignore
    return new ResourceLoader().add(...settings).load();
}

/**
 * Get the data from resource url
 */
export function get_resource(url: string) {
    return get_resource_map()[url];
}

// ------------------------------------------------------------------
// Node assemble functions
// ------------------------------------------------------------------
export * from 'engine/scene/assembler';

/**
 * Get the packed scene class or data
 */
export function get_packed_scene(url: string) {
    return get_resource_map()[url];
}
