import { uid } from 'engine/utils/index';
import { BLEND_MODES } from 'engine/const';
import settings from 'engine/settings';
import extract_uniforms_from_src from './extract_uniforms_from_src';
import RenderTarget from '../utils/RenderTarget';

const SOURCE_KEY_MAP = {};

export default class Filter {
    /**
     * @param {string} [vertex_src] - The source of the vertex shader.
     * @param {string} [fragment_src] - The source of the fragment shader.
     * @param {object} [uniform_data] - Custom uniforms to use to augment the built-in ones.
     */
    constructor(vertex_src, fragment_src, uniform_data) {
        /**
         * The vertex shader.
         *
         * @type {string}
         */
        this.vertex_src = vertex_src || Filter.default_vertex_src;

        /**
         * The fragment shader.
         *
         * @type {string}
         */
        this.fragment_src = fragment_src || Filter.default_fragment_src;

        this._blend_mode = BLEND_MODES.NORMAL;

        /** @type {Object<string, { value: any, name: string, type: string }>} */
        this.uniform_data = uniform_data || extract_uniforms_from_src(
            this.vertex_src,
            this.fragment_src
        );

        /**
         * An object containing the current values of custom uniforms.
         * @example <caption>Updating the value of a custom uniform</caption>
         * filter.uniforms.time = performance.now();
         *
         * @type {Object<string, any>}
         */
        this.uniforms = {};

        for (const i in this.uniform_data) {
            this.uniforms[i] = this.uniform_data[i].value;
            if (this.uniform_data[i].type) {
                this.uniform_data[i].type = this.uniform_data[i].type.toLowerCase();
            }
        }

        // this is where we store shader references..
        // TODO we could cache this!
        this.gl_shaders = {};

        // used for cacheing.. sure there is a better way!
        if (!SOURCE_KEY_MAP[this.vertex_src + this.fragment_src]) {
            SOURCE_KEY_MAP[this.vertex_src + this.fragment_src] = uid();
        }

        this.gl_shader_key = SOURCE_KEY_MAP[this.vertex_src + this.fragment_src];

        /**
         * The padding of the filter. Some filters require extra space to breath such as a blur.
         * Increasing this will add extra width and height to the bounds of the object that the
         * filter is applied to.
         */
        this.padding = 4;

        /**
         * The resolution of the filter. Setting this to be lower will lower the quality but
         * increase the performance of the filter.
         */
        this.resolution = settings.FILTER_RESOLUTION;

        /**
         * If enabled is true the filter is applied, if false it will not.
         */
        this.enabled = true;

        /**
         * If enabled, pixi will fit the filter area into boundaries for better performance.
         * Switch it off if it does not work for specific shader.
         */
        this.auto_fit = true;
    }

    /**
     * Applies the filter
     *
     * @param {import('../managers/FilterManager').default} filter_manager - The renderer to retrieve the filter from
     * @param {RenderTarget} input - The input render target.
     * @param {RenderTarget} output - The target to output to.
     * @param {boolean} clear - Should the output be cleared before rendering to it
     * @param {object} [current_state] - It's current state of filter.
     *        There are some useful properties in the current_state :
     *        target, filters, sourceFrame, destinationFrame, render_target, resolution
     */
    apply(filter_manager, input, output, clear, current_state) {
        // this.uniforms.filter_matrix = filter_manager.calculateSpriteMatrix(temp_matrix, window.panda);

        // do as you please!

        filter_manager.apply_filter(this, input, output, clear);

        // or just do a regular render..
    }

    /**
     * Sets the blendmode of the filter
     *
     * @type {number}
     */
    get blend_mode() {
        return this._blend_mode;
    }
    set blend_mode(value) {
        this._blend_mode = value;
    }

    /**
     * The default vertex shader source
     */
    static get default_vertex_src() {
        return `
            attribute vec2 a_vertex_position;
            attribute vec2 a_texture_coord;

            uniform mat3 projection_matrix;
            uniform mat3 filter_matrix;

            varying vec2 v_texture_coord;
            varying vec2 v_filter_coord;

            void main(void) {
                gl_Position = vec4((projection_matrix * vec3(a_vertex_position, 1.0)).xy, 0.0, 1.0);
                v_filter_coord = ( filter_matrix * vec3( a_texture_coord, 1.0)  ).xy;
                v_texture_coord = a_texture_coord ;
            }
        `;
    }

    /**
     * The default fragment shader source
     */
    static get default_fragment_src() {
        return `
            varying vec2 v_texture_coord;
            varying vec2 v_filter_coord;

            uniform sampler2D u_sampler;
            uniform sampler2D filterSampler;

            void main(void) {
                vec4 masky = texture2D(filterSampler, v_filter_coord);
                vec4 sample = texture2D(u_sampler, v_texture_coord);
                vec4 color;
                if (mod(v_filter_coord.x, 1.0) > 0.5) {
                    color = vec4(1.0, 0.0, 0.0, 1.0);
                } else {
                    color = vec4(0.0, 1.0, 0.0, 1.0);
                }
                // gl_FragColor = vec4(mod(v_filter_coord.x, 1.5), v_filter_coord.y, 0.0, 1.0);
                gl_FragColor = mix(sample, masky, 0.5);
                gl_FragColor *= sample.a;
            }
        `;
    }
}
