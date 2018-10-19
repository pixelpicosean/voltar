import WebGLManager from './WebGLManager';
import WebGLRenderer from '../WebGLRenderer';

export default class BlendModeManager extends WebGLManager {
    /**
     * @param {WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer) {
        super(renderer);

        /**
         * @member {number}
         */
        this.current_blend_mode = 99999;
    }

    /**
     * Sets-up the given blend_mode from WebGL's point of view.
     *
     * @param {number} blend_mode - the blend_mode, should be a Pixi const, such as
     *  `BLEND_MODES.ADD`. See {@link BLEND_MODES} for possible values.
     * @return {boolean} Returns if the blend mode was changed.
     */
    set_blend_mode(blend_mode) {
        if (this.current_blend_mode === blend_mode) {
            return false;
        }

        this.current_blend_mode = blend_mode;

        const mode = this.renderer.blend_modes[this.current_blend_mode];

        this.renderer.gl.blendFunc(mode[0], mode[1]);

        return true;
    }
}