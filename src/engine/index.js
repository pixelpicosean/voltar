// import polyfills. Done as an export to make sure polyfills are imported first
export * from './polyfill';

// export core
export * from './core';

// export libs
import * as accessibility from './accessibility';
import * as extract from './extract';
import * as extras from './extras';
import * as filters from './filters';
import * as interaction from './interaction';
import * as loaders from './loaders';
import * as mesh from './mesh';
import * as particles from './particles';
import * as prepare from './prepare';

// handle mixins now, after all code has been added
import { utils } from './core';
utils.mixins.performMixins();

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
    extras,
    filters,
    interaction,
    loaders,
    mesh,
    particles,
    prepare,
    loader,
};
