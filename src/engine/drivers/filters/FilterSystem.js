import RenderTexturePool from '../renderTexture/RenderTexturePool';
import Quad from '../utils/Quad';
import QuadUv from '../utils/QuadUv';
import UniformGroup from '../shader/UniformGroup';
import { DRAW_MODES } from '../constants';
import { Rect2 } from 'engine/core/math/rect2';
import Filter from './Filter';
import { OS } from 'engine/core/os/os';
import RenderTexture from '../renderTexture/RenderTexture';
import { Transform2D } from 'engine/core/math/transform_2d';

/**
 * System plugin to the renderer to manage filter states.
 */
class FilterState
{
    constructor()
    {
        this.renderTexture = null;

        /**
         * Target of the filters
         * We store for case when custom filter wants to know the element it was applied on
         * @type {any}
         * @private
         */
        this.target = null;

        /**
         * Compatibility with PixiJS v4 filters
         * @type {boolean}
         * @default false
         * @private
         */
        this.legacy = false;

        /**
         * Resolution of filters
         * @type {number}
         * @default 1
         * @private
         */
        this.resolution = 1;

        // next three fields are created only for root
        // re-assigned for everything else

        /**
         * Source frame
         * @type {Rect2}
         * @private
         */
        this.sourceFrame = new Rect2();

        /**
         * Destination frame
         * @type {Rect2}
         * @private
         */
        this.destinationFrame = new Rect2();

        /**
         * Collection of filters
         * @type {Filter[]}
         * @private
         */
        this.filters = [];
    }

    /**
     * clears the state
     * @private
     */
    clear()
    {
        this.target = null;
        this.filters = null;
        this.renderTexture = null;
    }
}

/**
 * System plugin to the renderer to manage the filters.
 */
export default class FilterSystem
{
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        /**
         * List of filters for the FilterSystem
         * @type {Object[]}
         * @readonly
         */
        this.defaultFilterStack = [{}];

        /**
         * stores a bunch of PO2 textures used for filtering
         */
        this.texturePool = new RenderTexturePool();

        this.texturePool.setScreenSize(OS.get_singleton().get_window_size());

        /**
         * a pool for storing filter states, save us creating new ones each tick
         * @type {Object[]}
         */
        this.statePool = [];

        /**
         * A very simple geometry used when drawing a filter effect to the screen
         * @type {Quad}
         */
        this.quad = new Quad();

        /**
         * Quad UVs
         * @type {QuadUv}
         */
        this.quadUv = new QuadUv();

        /**
         * Temporary rect for maths
         * @type {Rect2}
         */
        this.tempRect = new Rect2();

        /**
         * Active state
         * @type {object}
         */
        this.activeState = {};

        /**
         * This uniform group is attached to filter uniforms when used
         * @type {UniformGroup}
         * @property {Rect2} outputFrame
         * @property {Float32Array} inputSize
         * @property {Float32Array} inputPixel
         * @property {Float32Array} inputClamp
         * @property {Number} resolution
         * @property {Float32Array} filterArea
         * @property {Fload32Array} filterClamp
         */
        this.globalUniforms = new UniformGroup({
            outputFrame: this.tempRect,
            inputSize: new Float32Array(4),
            inputPixel: new Float32Array(4),
            inputClamp: new Float32Array(4),
            resolution: 1,

            // legacy variables
            filterArea: new Float32Array(4),
            filterClamp: new Float32Array(4),
        }, true);

        const size = OS.get_singleton().get_window_size();
        this._pixelsWidth = size.width;
        this._pixelsHeight = size.height;
    }

    /**
     * Adds a new filter to the System.
     *
     * @param {any} target - The target of the filter to render.
     * @param {Filter[]} filters - The filters to apply.
     */
    push(target, filters)
    {
        const renderer = this.renderer;
        const filterStack = this.defaultFilterStack;
        const state = this.statePool.pop() || new FilterState();

        let resolution = filters[0].resolution;
        let padding = filters[0].padding;
        let autoFit = filters[0].autoFit;
        let legacy = filters[0].legacy;

        for (let i = 1; i < filters.length; i++)
        {
            const filter =  filters[i];

            // lets use the lowest resolution..
            resolution = Math.min(resolution, filter.resolution);
            // and the largest amount of padding!
            padding = Math.max(padding, filter.padding);
            // only auto fit if all filters are autofit
            autoFit = autoFit || filter.autoFit;

            legacy = legacy || filter.legacy;
        }

        if (filterStack.length === 1)
        {
            this.defaultFilterStack[0].renderTexture = renderer.renderTexture.current;
        }

        filterStack.push(state);

        state.resolution = resolution;

        state.legacy = legacy;

        state.target = target;

        state.sourceFrame.copyFrom(target.filterArea || target.getBounds(true));

        state.sourceFrame.pad(padding);
        if (autoFit)
        {
            state.sourceFrame.fit(this.renderer.renderTexture.sourceFrame);
        }

        // round to whole number based on resolution
        state.sourceFrame.ceil(resolution);

        state.renderTexture = this.getOptimalFilterTexture(state.sourceFrame.width, state.sourceFrame.height, resolution);
        state.filters = filters;

        state.destinationFrame.width = state.renderTexture.width;
        state.destinationFrame.height = state.renderTexture.height;

        state.renderTexture.filterFrame = state.sourceFrame;

        renderer.renderTexture.bind(state.renderTexture, state.sourceFrame);// /, state.destinationFrame);
        renderer.renderTexture.clear();
    }

    /**
     * Pops off the filter and applies it.
     *
     */
    pop()
    {
        const filterStack = this.defaultFilterStack;
        const state = filterStack.pop();
        const filters = state.filters;

        this.activeState = state;

        const globalUniforms = this.globalUniforms.uniforms;

        globalUniforms.outputFrame = state.sourceFrame;
        globalUniforms.resolution = state.resolution;

        const inputSize = globalUniforms.inputSize;
        const inputPixel = globalUniforms.inputPixel;
        const inputClamp = globalUniforms.inputClamp;

        inputSize[0] = state.destinationFrame.width;
        inputSize[1] = state.destinationFrame.height;
        inputSize[2] = 1.0 / inputSize[0];
        inputSize[3] = 1.0 / inputSize[1];

        inputPixel[0] = inputSize[0] * state.resolution;
        inputPixel[1] = inputSize[1] * state.resolution;
        inputPixel[2] = 1.0 / inputPixel[0];
        inputPixel[3] = 1.0 / inputPixel[1];

        inputClamp[0] = 0.5 * inputPixel[2];
        inputClamp[1] = 0.5 * inputPixel[3];
        inputClamp[2] = (state.sourceFrame.width * inputSize[2]) - (0.5 * inputPixel[2]);
        inputClamp[3] = (state.sourceFrame.height * inputSize[3]) - (0.5 * inputPixel[3]);

        // only update the rect if its legacy..
        if (state.legacy)
        {
            const filterArea = globalUniforms.filterArea;

            filterArea[0] = state.destinationFrame.width;
            filterArea[1] = state.destinationFrame.height;
            filterArea[2] = state.sourceFrame.x;
            filterArea[3] = state.sourceFrame.y;

            globalUniforms.filterClamp = globalUniforms.inputClamp;
        }

        this.globalUniforms.update();

        const lastState = filterStack[filterStack.length - 1];

        if (filters.length === 1)
        {
            filters[0].apply(this, state.renderTexture, lastState.renderTexture, false, state);

            this.returnFilterTexture(state.renderTexture);
        }
        else
        {
            let flip = state.renderTexture;
            let flop = this.getOptimalFilterTexture(
                flip.width,
                flip.height,
                state.resolution
            );

            flop.filterFrame = flip.filterFrame;

            let i = 0;

            for (i = 0; i < filters.length - 1; ++i)
            {
                filters[i].apply(this, flip, flop, true, state);

                const t = flip;

                flip = flop;
                flop = t;
            }

            filters[i].apply(this, flip, lastState.renderTexture, false, state);

            this.returnFilterTexture(flip);
            this.returnFilterTexture(flop);
        }

        state.clear();
        this.statePool.push(state);
    }

    /**
     * Draws a filter.
     *
     * @param {Filter} filter - The filter to draw.
     * @param {RenderTexture} input - The input render target.
     * @param {RenderTexture} output - The target to output to.
     * @param {boolean} clear - Should the output be cleared before rendering to it
     */
    applyFilter(filter, input, output, clear)
    {
        const renderer = this.renderer;

        renderer.renderTexture.bind(output, output ? output.filterFrame : null);

        if (clear)
        {
            // gl.disable(gl.SCISSOR_TEST);
            renderer.renderTexture.clear();
            // gl.enable(gl.SCISSOR_TEST);
        }

        // set the uniforms..
        filter.uniforms.uSampler = input;
        filter.uniforms.filterGlobals = this.globalUniforms;

        // TODO make it so that the order of this does not matter..
        // because it does at the moment cos of global uniforms.
        // they need to get resynced

        renderer.state.set(filter.state);
        renderer.shader.bind(filter);

        if (filter.legacy)
        {
            // FIXME: is this correct?
            // this.quadUv.map(input._frame, input.filterFrame);

            // renderer.geometry.bind(this.quadUv);
            // renderer.geometry.draw(DRAW_MODES.TRIANGLES);
        }
        else
        {
            renderer.geometry.bind(this.quad);
            renderer.geometry.draw(DRAW_MODES.TRIANGLE_STRIP);
        }
    }

    /**
     * Multiply _input normalized coordinates_ to this matrix to get _sprite texture normalized coordinates_.
     *
     * Use `outputMatrix * vTextureCoord` in the shader.
     *
     * @param {Transform2D} outputMatrix - The matrix to output to.
     * @param {any} sprite - The sprite to map to.
     * @return {Transform2D} The mapped matrix.
     */
    calculateSpriteMatrix(outputMatrix, sprite)
    {
        const { sourceFrame, destinationFrame } = this.activeState;
        const { orig } = sprite._texture;
        const mappedMatrix = outputMatrix.set(destinationFrame.width, 0, 0,
            destinationFrame.height, sourceFrame.x, sourceFrame.y);
        const worldTransform = sprite.worldTransform.copyTo(Transform2D.TEMP_MATRIX);

        worldTransform.invert();
        mappedMatrix.prepend(worldTransform);
        mappedMatrix.scale(1.0 / orig.width, 1.0 / orig.height);
        mappedMatrix.translate(sprite.anchor.x, sprite.anchor.y);

        return mappedMatrix;
    }

    /**
     * Destroys this Filter System.
     */
    destroy()
    {
        // Those textures has to be destroyed by RenderTextureSystem or FramebufferSystem
        this.texturePool.clear(false);
    }

    /**
     * Gets a Power-of-Two render texture or fullScreen texture
     *
     * @protected
     * @param {number} minWidth - The minimum width of the render texture in real pixels.
     * @param {number} minHeight - The minimum height of the render texture in real pixels.
     * @param {number} [resolution=1] - The resolution of the render texture.
     * @return {RenderTexture} The new render texture.
     */
    getOptimalFilterTexture(minWidth, minHeight, resolution = 1)
    {
        return this.texturePool.getOptimalTexture(minWidth, minHeight, resolution);
    }

    /**
     * Gets extra render texture to use inside current filter
     * To be compliant with older filters, you can use params in any order
     *
     * @param {RenderTexture} [input] renderTexture from which size and resolution will be copied
     * @param {number} [resolution] override resolution of the renderTexture
     * @returns {RenderTexture}
     */
    getFilterTexture(input, resolution)
    {
        if (typeof input === 'number')
        {
            const swap = input;

            // @ts-ignore
            input = resolution;
            resolution = swap;
        }

        input = input || this.activeState.renderTexture;

        const filterTexture = this.texturePool.getOptimalTexture(input.width, input.height, resolution || input.resolution);

        filterTexture.filterFrame = input.filterFrame;

        return filterTexture;
    }

    /**
     * Frees a render texture back into the pool.
     *
     * @param {RenderTexture} renderTexture - The renderTarget to free
     */
    returnFilterTexture(renderTexture)
    {
        this.texturePool.returnTexture(renderTexture);
    }

    /**
     * Empties the texture pool.
     */
    emptyPool()
    {
        this.texturePool.clear(true);
    }

    /**
     * calls `texturePool.resize()`, affects fullScreen renderTextures
     */
    resize()
    {
        this.texturePool.setScreenSize(OS.get_singleton().get_window_size());
    }
}
