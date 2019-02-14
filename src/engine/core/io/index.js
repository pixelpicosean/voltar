import Loader from './Loader';
import * as async_ns from './async';
import * as b64 from './b64';

export default Loader;

export { default as Resource } from './Resource';

export const async = async_ns;

/**
 *
 * @static
 * @memberof Loader
 * @member {Class<encodeBinary>}
 */
export const encodeBinary = b64;

/**
 *
 * @deprecated
 * @see Loader.encodeBinary
 *
 * @static
 * @memberof Loader
 * @member {Class<encodeBinary>}
 */
export const base64 = b64;
