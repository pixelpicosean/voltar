import { BLEND_MODES } from '../constants';

/* eslint-disable max-len */

const BLEND = 0;
const OFFSET = 1;
const CULLING = 2;
const DEPTH_TEST = 3;
const WINDING = 4;

/**
 * This is a WebGL state, and is is passed The WebGL StateManager.
 *
 * Each mesh rendered may require WebGL to be in a different state.
 * For example you may want different blend mode or to enable polygon offsets
 */
export default class State
{
    constructor()
    {
        this.data = 0;

        this.blendMode = BLEND_MODES.NORMAL;
        this.polygonOffset = 0;

        this.blend = true;
        //  this.depthTest = true;
    }

    /**
     * Activates blending of the computed fragment color values
     *
     * @type {boolean}
     */
    get blend()
    {
        return !!(this.data & (1 << BLEND));
    }

    set blend(value) // eslint-disable-line require-jsdoc
    {
        if (!!(this.data & (1 << BLEND)) !== value)
        {
            this.data ^= (1 << BLEND);
        }
    }

    /**
     * Activates adding an offset to depth values of polygon's fragments
     *
     * @type {boolean}
     * @default false
     */
    get offsets()
    {
        return !!(this.data & (1 << OFFSET));
    }

    set offsets(value) // eslint-disable-line require-jsdoc
    {
        if (!!(this.data & (1 << OFFSET)) !== value)
        {
            this.data ^= (1 << OFFSET);
        }
    }

    /**
     * Activates culling of polygons.
     *
     * @type {boolean}
     * @default false
     */
    get culling()
    {
        return !!(this.data & (1 << CULLING));
    }

    set culling(value) // eslint-disable-line require-jsdoc
    {
        if (!!(this.data & (1 << CULLING)) !== value)
        {
            this.data ^= (1 << CULLING);
        }
    }

    /**
     * Activates depth comparisons and updates to the depth buffer.
     *
     * @type {boolean}
     * @default false
     */
    get depthTest()
    {
        return !!(this.data & (1 << DEPTH_TEST));
    }

    set depthTest(value) // eslint-disable-line require-jsdoc
    {
        if (!!(this.data & (1 << DEPTH_TEST)) !== value)
        {
            this.data ^= (1 << DEPTH_TEST);
        }
    }

    /**
     * Specifies whether or not front or back-facing polygons can be culled.
     * @type {boolean}
     * @default false
     */
    get clockwiseFrontFace()
    {
        return !!(this.data & (1 << WINDING));
    }

    set clockwiseFrontFace(value) // eslint-disable-line require-jsdoc
    {
        if (!!(this.data & (1 << WINDING)) !== value)
        {
            this.data ^= (1 << WINDING);
        }
    }

    /**
     * Setting this mode to anything other than NO_BLEND will automatically switch blending on.
     *
     * @type {number}
     */
    get blendMode()
    {
        return this._blendMode;
    }

    set blendMode(value) // eslint-disable-line require-jsdoc
    {
        this.blend = (value !== BLEND_MODES.NONE);
        this._blendMode = value;
    }

    /**
     * The polygon offset. Setting this property to anything other than 0 will automatically enable polygon offset fill.
     *
     * @type {number}
     * @default 0
     */
    get polygonOffset()
    {
        return this._polygonOffset;
    }

    set polygonOffset(value) // eslint-disable-line require-jsdoc
    {
        this.offsets = !!value;
        this._polygonOffset = value;
    }

    static for2d()
    {
        const state = new State();

        state.depthTest = false;
        state.blend = true;

        return state;
    }
}

