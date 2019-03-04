import WebGLManager from './WebGLManager';
import RenderTarget from '../utils/RenderTarget';
import Quad from '../utils/Quad';
import { Rectangle, nearest_po2 } from 'engine/math/index';
import Shader from 'engine/Shader';
import * as filter_transforms from '../filters/filter_transforms';
import Filter from '../filters/Filter';
import WebGLRenderer from '../WebGLRenderer';
import Node2D from 'engine/scene/Node2D';
import Matrix from 'engine/math/Matrix';

export class FilterState {
    constructor() {
        /**
         * @type {RenderTarget}
         */
        this.render_target = null;
        this.resolution = 1;

        // those three objects are used only for root
        // re-assigned for everything else
        this.source_frame = new Rectangle();
        this.destination_frame = new Rectangle();
        /** @type {Filter[]} */
        this.filters = [];
        /** @type {Node2D} */
        this.target = null;
        this.resolution = 1;
    }

    /**
     * clears the state
     */
    clear() {
        this.filters = null;
        this.target = null;
        this.render_target = null;
    }
}

const screen_key = 'screen';

export default class FilterManager extends WebGLManager {
    /**
     * @param {WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer) {
        super(renderer);

        this.gl = this.renderer.gl;
        // know about sprites!
        this.quad = new Quad(this.gl, renderer.state.attrib_state);

        this.shader_cache = {};
        // todo add default!
        this.pool = {};

        /**
         * @type {{index: number, stack: Array<FilterState>}}
         */
        this.filter_data = null;

        /**
         * @type {Array<Filter>}
         */
        this.managed_filters = [];

        this.renderer.connect('prerender', this.on_pre_render, this);

        this._screen_width = renderer.view.width;
        this._screen_height = renderer.view.height;
    }

    /**
     * Adds a new filter to the manager.
     *
     * @param {Node2D} target - The target of the filter to render.
     * @param {Filter[]} filters - The filters to apply.
     */
    push_filter(target, filters) {
        const renderer = this.renderer;

        let filter_data = this.filter_data;

        if (!filter_data) {
            filter_data = this.renderer._active_render_target.filter_stack;

            // add new stack
            const filter_state = new FilterState();

            filter_state.source_frame = filter_state.destination_frame = this.renderer._active_render_target.size;
            filter_state.render_target = renderer._active_render_target;

            this.renderer._active_render_target.filter_data = filter_data = {
                index: 0,
                stack: [filter_state],
            };

            this.filter_data = filter_data;
        }

        // get the current filter state..
        let current_state = filter_data.stack[++filter_data.index];
        const render_target_frame = filter_data.stack[0].destination_frame;

        if (!current_state) {
            current_state = filter_data.stack[filter_data.index] = new FilterState();
        }

        const full_screen = target.filter_area
            && target.filter_area.x === 0
            && target.filter_area.y === 0
            && target.filter_area.width === renderer.screen.width
            && target.filter_area.height === renderer.screen.height;

        // for now we go off the filter of the first resolution..
        const resolution = filters[0].resolution;
        const padding = filters[0].padding | 0;
        const target_bounds = full_screen ? renderer.screen : (target.filter_area || target.get_bounds(true));
        const source_frame = current_state.source_frame;
        const destination_frame = current_state.destination_frame;

        source_frame.x = ((target_bounds.x * resolution) | 0) / resolution;
        source_frame.y = ((target_bounds.y * resolution) | 0) / resolution;
        source_frame.width = ((target_bounds.width * resolution) | 0) / resolution;
        source_frame.height = ((target_bounds.height * resolution) | 0) / resolution;

        if (!full_screen) {
            if (filter_data.stack[0].render_target.transform) {
                // TODO we should fit the rect around the transform..
            } else if (filters[0].auto_fit) {
                source_frame.fit_to(render_target_frame);
            }

            // lets apply the padding After we fit the element to the screen.
            // this should stop the strange side effects that can occur when cropping to the edges
            source_frame.grow_to(padding);
        }

        destination_frame.width = source_frame.width;
        destination_frame.height = source_frame.height;

        // lets play the padding after we fit the element to the screen.
        // this should stop the strange side effects that can occur when cropping to the edges

        const render_target = this.get_pot_render_target(renderer.gl, source_frame.width, source_frame.height, resolution);

        current_state.target = target;
        current_state.filters = filters;
        current_state.resolution = resolution;
        current_state.render_target = render_target;

        // bind the render target to draw the shape in the top corner..

        render_target.set_frame(destination_frame, source_frame);

        // bind the render target
        renderer.bind_render_target(render_target);
        render_target.clear();
    }

    /**
     * Pops off the filter and applies it.
     */
    pop_filter() {
        const filter_data = this.filter_data;

        const last_state = filter_data.stack[filter_data.index - 1];
        const current_state = filter_data.stack[filter_data.index];

        this.quad.map(current_state.render_target.size, current_state.source_frame).upload();

        const filters = current_state.filters;

        if (filters.length === 1) {
            filters[0].apply(this, current_state.render_target, last_state.render_target, false, current_state);
            this.free_pot_render_target(current_state.render_target);
        } else {
            let flip = current_state.render_target;
            let flop = this.get_pot_render_target(
                this.renderer.gl,
                current_state.source_frame.width,
                current_state.source_frame.height,
                current_state.resolution
            );

            flop.set_frame(current_state.destination_frame, current_state.source_frame);

            // finally lets clear the render target before drawing to it..
            flop.clear();

            let i = 0;

            for (i = 0; i < filters.length - 1; ++i) {
                filters[i].apply(this, flip, flop, true, current_state);

                const t = flip;

                flip = flop;
                flop = t;
            }

            filters[i].apply(this, flip, last_state.render_target, false, current_state);

            this.free_pot_render_target(flip);
            this.free_pot_render_target(flop);
        }

        current_state.clear();
        filter_data.index--;

        if (filter_data.index === 0) {
            this.filter_data = null;
        }
    }

    /**
     * Draws a filter.
     *
     * @param {Filter} filter - The filter to draw.
     * @param {RenderTarget} input - The input render target.
     * @param {RenderTarget} output - The target to output to.
     * @param {boolean} [clear] - Should the output be cleared before rendering to it
     */
    apply_filter(filter, input, output, clear = false) {
        const renderer = this.renderer;
        const gl = renderer.gl;

        let shader = filter.gl_shaders[renderer.CONTEXT_UID];

        // cacheing..
        if (!shader) {
            if (filter.gl_shader_key) {
                shader = this.shader_cache[filter.gl_shader_key];

                if (!shader) {
                    shader = new Shader(this.gl, filter.vertex_src, filter.fragment_src);

                    filter.gl_shaders[renderer.CONTEXT_UID] = this.shader_cache[filter.gl_shader_key] = shader;
                    this.managed_filters.push(filter);
                }
            } else {
                shader = filter.gl_shaders[renderer.CONTEXT_UID] = new Shader(this.gl, filter.vertex_src, filter.fragment_src);
                this.managed_filters.push(filter);
            }

            // TODO - this only needs to be done once?
            renderer.bind_vao(null);

            this.quad.init_vao(shader);
        }

        renderer.bind_vao(this.quad.vao);

        renderer.bind_render_target(output);

        if (clear) {
            gl.disable(gl.SCISSOR_TEST);
            renderer.clear();// [1, 1, 1, 1]);
            gl.enable(gl.SCISSOR_TEST);
        }

        // in case the render target is being masked using a scissor rect
        if (output === renderer.mask_manager.scissor_render_target) {
            renderer.mask_manager.push_scissor_mask(null, renderer.mask_manager.scissor_data);
        }

        renderer.bind_shader(shader);

        // free unit 0 for us, doesn't matter what was there
        // don't try to restore it, because sync_uniforms can upload it to another slot
        // and it'll be a problem
        const tex = this.renderer.empty_textures[0];

        this.renderer.bound_textures[0] = tex;
        // this syncs the pixi filters  uniforms with glsl uniforms
        this.sync_uniforms(shader, filter);

        renderer.state.set_blend_mode(filter.blend_mode);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, input.texture.texture);

        this.quad.vao.draw(this.renderer.gl.TRIANGLES, 6, 0);

        gl.bindTexture(gl.TEXTURE_2D, tex._gl_textures[this.renderer.CONTEXT_UID].texture);
    }

    /**
     * Uploads the uniforms of the filter.
     *
     * @param {Shader} shader - The underlying gl shader.
     * @param {Filter} filter - The filter we are synchronizing.
     */
    sync_uniforms(shader, filter) {
        const uniform_data = filter.uniform_data;
        const uniforms = filter.uniforms;

        // 0 is reserved for the pixi texture so we start at 1!
        let texture_count = 1;
        /** @type {FilterState} */
        let current_state = null;

        // filter_area and filter_clamp that are handled by FilterManager directly
        // they must not appear in uniform_data

        if (shader.uniforms.filter_area) {
            current_state = this.filter_data.stack[this.filter_data.index];

            /** @type {number[]} */
            const filter_area = shader.uniforms.filter_area;

            filter_area[0] = current_state.render_target.size.width;
            filter_area[1] = current_state.render_target.size.height;
            filter_area[2] = current_state.source_frame.x;
            filter_area[3] = current_state.source_frame.y;

            shader.uniforms.filter_area = filter_area;
        }

        // use this to clamp displaced texture coords so they belong to filter_area
        // see displacementFfilter_clampent shader for an example
        if (shader.uniforms.filter_clamp) {
            current_state = current_state || this.filter_data.stack[this.filter_data.index];

            const filter_clamp = shader.uniforms.filter_clamp;

            filter_clamp[0] = 0;
            filter_clamp[1] = 0;
            filter_clamp[2] = (current_state.source_frame.width - 1) / current_state.render_target.size.width;
            filter_clamp[3] = (current_state.source_frame.height - 1) / current_state.render_target.size.height;

            shader.uniforms.filter_clamp = filter_clamp;
        }

        // TODO Caching layer..
        for (const i in uniform_data) {
            if (!shader.uniforms.data[i]) {
                continue;
            }

            const type = uniform_data[i].type;

            if (type === 'sampler2d' && uniforms[i] !== 0) {
                if (uniforms[i].base_texture) {
                    shader.uniforms[i] = this.renderer.bind_texture(uniforms[i].base_texture, texture_count);
                } else {
                    shader.uniforms[i] = texture_count;

                    // TODO
                    // this is helpful as renderTargets can also be set.
                    // Although thinking about it, we could probably
                    // make the filter texture cache return a RenderTexture
                    // rather than a render_target
                    const gl = this.renderer.gl;

                    this.renderer.bound_textures[texture_count] = this.renderer.empty_textures[texture_count];
                    gl.activeTexture(gl.TEXTURE0 + texture_count);

                    uniforms[i].texture.bind();
                }

                texture_count++;
            } else if (type === 'mat3') {
                // check if its pixi matrix..
                if (uniforms[i].a !== undefined) {
                    shader.uniforms[i] = uniforms[i].to_array(true);
                }
                else {
                    shader.uniforms[i] = uniforms[i];
                }
            } else if (type === 'vec2') {
                // check if its a point..
                if (uniforms[i].x !== undefined) {
                    const val = shader.uniforms[i] || new Float32Array(2);

                    val[0] = uniforms[i].x;
                    val[1] = uniforms[i].y;
                    shader.uniforms[i] = val;
                }
                else {
                    shader.uniforms[i] = uniforms[i];
                }
            } else if (type === 'float') {
                if (shader.uniforms.data[i].value !== uniform_data[i]) {
                    shader.uniforms[i] = uniforms[i];
                }
            } else {
                shader.uniforms[i] = uniforms[i];
            }
        }
    }

    /**
     * Gets a render target from the pool, or creates a new one.
     *
     * @param {boolean} clear - Should we clear the render texture when we get it?
     * @param {number} [resolution] - The resolution of the target.
     */
    get_render_rarget(clear, resolution) {
        const current_state = this.filter_data.stack[this.filter_data.index];
        const render_target = this.get_pot_render_target(
            this.renderer.gl,
            current_state.source_frame.width,
            current_state.source_frame.height,
            resolution || current_state.resolution
        );

        render_target.set_frame(current_state.destination_frame, current_state.source_frame);

        return render_target;
    }

    /**
     * Returns a render target to the pool.
     *
     * @param {RenderTarget} render_target - The render target to return.
     */
    return_render_rarget(render_target) {
        this.free_pot_render_target(render_target);
    }

    /**
     * Calculates the mapped matrix.
     *
     * TODO playing around here.. this is temporary - (will end up in the shader)
     * this returns a matrix that will normalise map filter cords in the filter to screen space
     *
     * @param {Matrix} output_matrix - the matrix to output to.
     */
    calculateScreenSpaceMatrix(output_matrix) {
        const current_state = this.filter_data.stack[this.filter_data.index];

        return filter_transforms.calculate_screen_space_matrix(
            output_matrix,
            current_state.source_frame,
            current_state.render_target.size
        );
    }

    /**
     * Multiply v_texture_coord to this matrix to achieve (0,0,1,1) for filter_area
     *
     * @param {Matrix} output_matrix - The matrix to output to.
     */
    calculate_normalized_screen_space_matrix(output_matrix) {
        const current_state = this.filter_data.stack[this.filter_data.index];

        return filter_transforms.calculate_normalized_screen_space_matrix(
            output_matrix,
            current_state.source_frame,
            current_state.render_target.size
        );
    }

    /**
     * This will map the filter coord so that a texture can be used based on the transform of a sprite
     *
     * @param {Matrix} output_matrix - The matrix to output to.
     * @param {import('engine/index').Sprite} sprite - The sprite to map to.
     */
    calculate_sprite_matrix(output_matrix, sprite) {
        const currentState = this.filter_data.stack[this.filter_data.index];

        return filter_transforms.calculate_sprite_matrix(
            output_matrix,
            currentState.source_frame,
            currentState.render_target.size,
            sprite
        );
    }

    /**
     * Destroys this Filter Manager.
     *
     * @param {boolean} [context_lost=false] context was lost, do not free shaders
     */
    destroy(context_lost) {
        const renderer = this.renderer;
        const filters = this.managed_filters;

        renderer.disconnect('prerender', this.on_pre_render, this);

        for (let i = 0; i < filters.length; i++) {
            if (!context_lost) {
                filters[i].gl_shaders[renderer.CONTEXT_UID].destroy();
            }
            delete filters[i].gl_shaders[renderer.CONTEXT_UID];
        }

        this.shader_cache = {};
        if (!context_lost) {
            this.emptyPool();
        } else {
            this.pool = {};
        }
    }

    /**
     * Gets a Power-of-Two render texture.
     *
     * TODO move to a seperate class could be on renderer?
     * also - could cause issue with multiple contexts?
     *
     * @private
     * @param {WebGLRenderingContext} gl - The webgl rendering context
     * @param {number} min_width - The minimum width of the render target.
     * @param {number} min_height - The minimum height of the render target.
     * @param {number} resolution - The resolution of the render target.
     * @return {RenderTarget} The new render target.
     */
    get_pot_render_target(gl, min_width, min_height, resolution) {
        let key = screen_key;

        min_width *= resolution;
        min_height *= resolution;

        if (min_width !== this._screen_width
            || min_height !== this._screen_height) {
            // TODO you could return a bigger texture if there is not one in the pool?
            min_width = nearest_po2(min_width * resolution);
            min_height = nearest_po2(min_height * resolution);
            key = (((min_width & 0xFFFF) << 16) | (min_height & 0xFFFF)).toString();
        }

        if (!this.pool[key]) {
            this.pool[key] = [];
        }

        let render_target = this.pool[key].pop();

        // creating render target will cause texture to be bound!
        if (!render_target) {
            // temporary bypass cache..
            const tex = this.renderer.bound_textures[0];

            gl.activeTexture(gl.TEXTURE0);

            // internally - this will cause a texture to be bound..
            render_target = new RenderTarget(gl, min_width, min_height, null, 1);

            // set the current one back
            gl.bindTexture(gl.TEXTURE_2D, tex._gl_textures[this.renderer.CONTEXT_UID].texture);
        }

        // manually tweak the resolution...
        // this will not modify the size of the frame buffer, just its resolution.
        render_target.resolution = resolution;
        render_target.default_frame.width = render_target.size.width = min_width / resolution;
        render_target.default_frame.height = render_target.size.height = min_height / resolution;
        render_target.filter_pool_key = key;

        return render_target;
    }

    /**
     * Empties the texture pool.
     *
     */
    emptyPool() {
        for (const i in this.pool) {
            const textures = this.pool[i];

            if (textures) {
                for (let j = 0; j < textures.length; j++) {
                    textures[j].destroy(true);
                }
            }
        }

        this.pool = {};
    }

    /**
     * Frees a render target back into the pool.
     *
     * @param {RenderTarget} render_target - The render_target to free
     */
    free_pot_render_target(render_target) {
        this.pool[render_target.filter_pool_key].push(render_target);
    }

    /**
     * Called before the renderer starts rendering.
     *
     */
    on_pre_render() {
        if (this._screen_width !== this.renderer.view.width
            || this._screen_height !== this.renderer.view.height) {
            this._screen_width = this.renderer.view.width;
            this._screen_height = this.renderer.view.height;

            const textures = this.pool[screen_key];

            if (textures) {
                for (let j = 0; j < textures.length; j++) {
                    textures[j].destroy(true);
                }
            }
            this.pool[screen_key] = [];
        }
    }
}
