import Shader from '../shader/Shader';
import Program from '../shader/Program';
import State from '../state/State';
import * as settings from '../settings';
import defaultVertex from './defaultFilter.vert';
import defaultFragment from './defaultFilter.frag';
import RenderTexture from '../renderTexture/RenderTexture';

/**
 * Filter is a special type of WebGL shader that is applied to the screen.
 */
export default class Filter extends Shader
{
    /**
     * @param {string} [vertexSrc] - The source of the vertex shader.
     * @param {string} [fragmentSrc] - The source of the fragment shader.
     * @param {object} [uniforms] - Custom uniforms to use to augment the built-in ones.
     */
    constructor(vertexSrc, fragmentSrc, uniforms)
    {
        const program = Program.from(vertexSrc || Filter.defaultVertexSrc,
            fragmentSrc || Filter.defaultFragmentSrc);

        super(program, uniforms);

        /**
         * The padding of the filter. Some filters require extra space to breath such as a blur.
         * Increasing this will add extra width and height to the bounds of the object that the
         * filter is applied to.
         *
         * @type {number}
         */
        this.padding = 0;

        /**
         * The resolution of the filter. Setting this to be lower will lower the quality but
         * increase the performance of the filter.
         *
         * @type {number}
         */
        this.resolution = settings.FILTER_RESOLUTION;

        /**
         * If enabled is true the filter is applied, if false it will not.
         *
         * @type {boolean}
         */
        this.enabled = true;

        /**
         * If enabled, PixiJS will fit the filter area into boundaries for better performance.
         * Switch it off if it does not work for specific shader.
         *
         * @type {boolean}
         */
        this.autoFit = true;

        /**
         * Legacy filters use position and uvs from attributes
         * @type {boolean}
         * @readonly
         */
        this.legacy = !!this.program.attributeData.aTextureCoord;

        /**
         * The WebGL state the filter requires to render
         * @type {State}
         */
        this.state = new State();
    }

    /**
     * Applies the filter
     *
     * @param {import('./FilterSystem').default} filterManager - The renderer to retrieve the filter from
     * @param {RenderTexture} input - The input render target.
     * @param {RenderTexture} output - The target to output to.
     * @param {boolean} clear - Should the output be cleared before rendering to it
     */
    apply(filterManager, input, output, clear)
    {
        // do as you please!

        filterManager.applyFilter(this, input, output, clear);

        // or just do a regular render..
    }

    /**
     * Sets the blendmode of the filter
     *
     * @type {number}
     * @default BLEND_MODES.NORMAL
     */
    get blendMode()
    {
        return this.state.blendMode;
    }

    set blendMode(value) // eslint-disable-line require-jsdoc
    {
        this.state.blendMode = value;
    }

    /**
     * The default vertex shader source
     *
     * @static
     * @type {string}
     * @constant
     */
    static get defaultVertexSrc()
    {
        return defaultVertex;
    }

    /**
     * The default fragment shader source
     *
     * @static
     * @type {string}
     * @constant
     */
    static get defaultFragmentSrc()
    {
        return defaultFragment;
    }
}

/**
 * Used for caching shader IDs
 *
 * @static
 * @type {object}
 * @protected
 */
Filter.SOURCE_KEY_MAP = {};
