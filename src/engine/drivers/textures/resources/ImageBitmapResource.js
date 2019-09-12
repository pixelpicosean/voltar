import BaseImageResource from './BaseImageResource';

/**
 * Resource type for ImageBitmap.
 * @param {ImageBitmap} source - Image element to use
 */
export default class ImageBitmapResource extends BaseImageResource
{
    /**
     * Used to auto-detect the type of resource.
     *
     * @static
     * @param {ImageBitmap} source - The source object
     * @return {boolean} `true` if source is an ImageBitmap
     */
    static test(source)
    {
        return !!window.createImageBitmap && source instanceof ImageBitmap;
    }
}
