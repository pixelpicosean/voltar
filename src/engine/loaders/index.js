import Loader from './loader';

/**
 * This namespace contains APIs which extends the {@link https://github.com/englercj/resource-loader resource-loader} module
 * for loading assets, data, and other resources dynamically.
 * @example
 * const loader = new loaders.Loader();
 * loader.add('bunny', 'data/bunny.png')
 *       .add('spaceship', 'assets/spritesheet.json');
 * loader.load((loader, resources) => {
 *    // resources.bunny
 *    // resources.spaceship
 * });
 */
export { Loader };
export { default as bitmap_font_parser, parse as parse_bitmap_font_data } from './bitmap_font_parser';
export { default as spritesheet_parser, get_resource_path } from './spritesheet_parser';
export { default as texture_parser } from './texture_parser';

/**
 * Reference to **resource-loader**'s Resource class.
 * See https://github.com/englercj/resource-loader
 * @class Resource
 */
export { Resource } from 'resource-loader';

/**
 * A premade instance of the loader that can be used to load resources.
 * @type {Loader}
 */
const shared = new Loader();

shared.destroy = () => {
    // protect destroying shared loader
};

export { shared };
