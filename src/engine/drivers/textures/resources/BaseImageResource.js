import TextureResource from './Resource';
import { determineCrossOrigin } from '../../utils/determineCrossOrigin';

/**
 * Base for all the image/canvas resources
 */
export default class BaseImageResource extends TextureResource
{
    /**
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|SVGElement} source
     */
    constructor(source)
    {
        // @ts-ignore
        const width = source.naturalWidth || source.videoWidth || source.width;
        // @ts-ignore
        const height = source.naturalHeight || source.videoHeight || source.height;

        super(width, height);

        /**
         * The source element
         * @member {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|SVGElement}
         * @readonly
         */
        this.source = source;
    }

    /**
     * Set cross origin based detecting the url and the crossorigin
     * @protected
     * @param {HTMLElement} element - Element to apply crossOrigin
     * @param {string} url - URL to check
     * @param {boolean|string} [crossorigin=true] - Cross origin value to use
     */
    static crossOrigin(element, url, crossorigin)
    {
        if (crossorigin === undefined && url.indexOf('data:') !== 0)
        {
            // @ts-ignore
            element.crossOrigin = determineCrossOrigin(url);
        }
        else if (crossorigin !== false)
        {
            // @ts-ignore
            element.crossOrigin = typeof crossorigin === 'string' ? crossorigin : 'anonymous';
        }
    }

    /**
     * Upload the texture to the GPU.
     * @param {import('../../rasterizer_canvas').RasterizerCanvas} renderer Upload to the renderer
     * @param {import('../BaseTexture').default} baseTexture Reference to parent texture
     * @param {import('../GLTexture').default} glTexture
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|SVGElement} [source] (optional)
     * @returns {boolean} true is success
     */
    upload(renderer, baseTexture, glTexture, source)
    {
        const gl = renderer.gl;
        const width = baseTexture.realWidth;
        const height = baseTexture.realHeight;

        source = source || this.source;

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, baseTexture.premultiplyAlpha);

        if (baseTexture.target === gl.TEXTURE_2D && glTexture.width === width && glTexture.height === height)
        {
            // @ts-ignore
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, baseTexture.format, baseTexture.type, source);
        }
        else
        {
            glTexture.width = width;
            glTexture.height = height;

            // @ts-ignore
            gl.texImage2D(baseTexture.target, 0, baseTexture.format, baseTexture.format, baseTexture.type, source);
        }

        return true;
    }

    /**
     * Checks if source width/height was changed, resize can cause extra baseTexture update.
     * Triggers one update in any case.
     */
    update()
    {
        if (this.destroyed)
        {
            return;
        }

        // @ts-ignore
        const width = this.source.naturalWidth || this.source.videoWidth || this.source.width;
        // @ts-ignore
        const height = this.source.naturalHeight || this.source.videoHeight || this.source.height;

        this.resize(width, height);

        super.update();
    }

    /**
     * Destroy this BaseImageResource
     * @override
     * @param {import('../BaseTexture').default} [fromTexture] Optional base texture
     */
    dispose(fromTexture)
    {
        this.source = null;
    }
}
