import BaseImageResource from './BaseImageResource';

/**
 * @interface OffscreenCanvas
 */

/**
 * Resource type for HTMLCanvasElement.
 * @param {HTMLCanvasElement} source - Canvas element to use
 */
export default class CanvasResource extends BaseImageResource
{
    /**
     * Used to auto-detect the type of resource.
     *
     * @static
     * @param {HTMLCanvasElement|OffscreenCanvas} source - The source object
     * @return {boolean} `true` if source is HTMLCanvasElement or OffscreenCanvas
     */
    static test(source)
    {
        // @ts-ignore
        const { OffscreenCanvas } = window;

        // Check for browsers that don't yet support OffscreenCanvas
        if (OffscreenCanvas && source instanceof OffscreenCanvas)
        {
            return true;
        }

        return source instanceof HTMLCanvasElement;
    }
}
