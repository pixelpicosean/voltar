import WebGLManager from './WebGLManager';

/**
 * @class
 * @memberof V
 * @extends V.WebGLManager
 */
export default class BlendModeManager extends WebGLManager
{
    /**
     * @param {V.WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer)
    {
        super(renderer);

        /**
         * @member {number}
         */
        this.currentBlendMode = 99999;
    }

    /**
     * Sets-up the given blend_mode from WebGL's point of view.
     *
     * @param {number} blend_mode - the blend_mode, should be a Pixi const, such as
     *  `V.BLEND_MODES.ADD`. See {@link V.BLEND_MODES} for possible values.
     * @return {boolean} Returns if the blend mode was changed.
     */
    setBlendMode(blend_mode)
    {
        if (this.currentBlendMode === blend_mode)
        {
            return false;
        }

        this.currentBlendMode = blend_mode;

        const mode = this.renderer.blend_modes[this.currentBlendMode];

        this.renderer.gl.blendFunc(mode[0], mode[1]);

        return true;
    }
}
