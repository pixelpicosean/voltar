import Filter from 'engine/servers/visual/filters/filter';
import Vert from '../fragments/default.vert';
import Frag from './noise.frag';

/**
 * @author Vico @vicocotea
 * original filter: https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/noise.js
 */

/**
 * A Noise effect filter.
 */
export default class Noise extends Filter {
    /**
     * @param {number} noise - The noise intensity, should be a normalized value in the range [0, 1].
     * @param {number} seed - A random seed for the noise generation. Default is `Math.random()`.
     */
    constructor(noise = 0.5, seed = Math.random()) {
        super(Vert, Frag);

        this.noise = noise;
        this.seed = seed;
    }

    /**
     * The amount of noise to apply, this value should be in the range (0, 1].
     *
     * @type {number}
     * @default 0.5
     */
    get noise() {
        return this.uniforms.u_noise;
    }
    set noise(value) {
        this.uniforms.u_noise = value;
    }

    /**
     * A seed value to apply to the random noise generation. `Math.random()` is a good value to use.
     *
     * @type {number}
     */
    get seed() {
        return this.uniforms.u_seed;
    }
    set seed(value) {
        this.uniforms.u_seed = value;
    }
}
