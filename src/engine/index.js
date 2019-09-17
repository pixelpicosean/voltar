import { ResourceLoader } from './core/io/resource_loader';

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

export * from 'engine/scene/2d/canvas_item';
export * from 'engine/scene/2d/node_2d';

/**
 * @param  {...(string | Object)} settings
 */
export function load(...settings) {
    return new ResourceLoader().add(...settings).load();
}
