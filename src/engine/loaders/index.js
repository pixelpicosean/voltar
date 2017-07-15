import Loader from './loader';

/**
 * This namespace contains APIs which extends the {@link https://github.com/englercj/resource-loader resource-loader} module
 * for loading assets, data, and other resources dynamically.
 * @example
 * const loader = new V.loaders.Loader();
 * loader.add('bunny', 'data/bunny.png')
 *       .add('spaceship', 'assets/spritesheet.json');
 * loader.load((loader, resources) => {
 *    // resources.bunny
 *    // resources.spaceship
 * });
 * @namespace V.loaders
 */
export { Loader };
export { default as bitmapFontParser, parse as parseBitmapFontData } from './bitmapFontParser';
export { default as spritesheetParser, getResourcePath } from './spritesheetParser';
export { default as textureParser } from './textureParser';

/**
 * Reference to **resource-loader**'s Resource class.
 * See https://github.com/englercj/resource-loader
 * @class Resource
 * @memberof V.loaders
 */
export { Resource } from 'resource-loader';

/**
 * A premade instance of the loader that can be used to load resources.
 * @name shared
 * @memberof V.loaders
 * @type {V.loaders.Loader}
 */
const shared = new Loader();

shared.destroy = () =>
{
    // protect destroying shared loader
};

export { shared };
