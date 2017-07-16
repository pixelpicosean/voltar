// import polyfills. Done as an export to make sure polyfills are imported first
export * from './polyfill';

// export core
export * from './core';

// export libs
import * as accessibility from './accessibility';
import * as extract from './extract';
import * as filters from './filters';
import * as interaction from './interaction';
import * as loaders from './loaders';
import * as prepare from './prepare';

// handle mixins now, after all code has been added
import { utils } from './core';
utils.mixins.perform_mixins();

/**
 * Alias for {@link V.loaders.shared}.
 * @name loader
 * @memberof V
 * @type {V.loader.Loader}
 */
const loader = loaders.shared || null;

export {
    accessibility,
    extract,
    filters,
    interaction,
    loaders,
    prepare,
    loader,
};

import SceneTree from './SceneTree';

export * from './SceneTree';
export const scene_tree = new SceneTree();
