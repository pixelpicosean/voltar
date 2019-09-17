// ------------------------------------------------------------------
// 3rd party libs
// ------------------------------------------------------------------
export * from 'engine/dep/index';

export { VObject, GDCLASS } from 'engine/core/v_object';

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
// export * from 'engine/scene/2d/cpu_particles_2d';

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

// ------------------------------------------------------------------
// Resource
// ------------------------------------------------------------------
export * from 'engine/scene/resources/texture';
// export * from 'engine/scene/resources/tile_set';
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

import { ResourceLoader } from './core/io/resource_loader';

/**
 * @param  {...(string | Object)} settings
 */
export function load(...settings) {
    return new ResourceLoader().add(...settings).load();
}
