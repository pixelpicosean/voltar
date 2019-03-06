import { hex2rgb } from 'engine/utils/index';
import { SHAPES } from 'engine/const';
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import ObjectRenderer from 'engine/servers/visual/utils/object_renderer';

import Graphics from '../graphics';

import build_poly from './utils/build_poly';
import build_rectangle from './utils/build_rectangle';
import build_rounded_rectangle from './utils/build_rounded_rectangle';
import build_circle from './utils/build_circle';
import WebGLGraphicsData from './webgl_graphics_data';
import PrimitiveShader from './shaders/primitive_shader';

/**
 * Renders the graphics object.
 */
export default class GraphicsRenderer extends ObjectRenderer {
    /**
     * @param {WebGLRenderer} renderer - The renderer this object renderer works for.
     */
    constructor(renderer) {
        super(renderer);

        /**
         * @type {WebGLGraphicsData[]}
         */
        this.graphics_data_pool = [];

        this.primitive_shader = null;

        this.gl = renderer.gl;

        // easy access!
        this.CONTEXT_UID = 0;
    }

    /**
     * Called when there is a WebGL context change
     */
    on_context_change() {
        this.gl = this.renderer.gl;
        this.CONTEXT_UID = this.renderer.CONTEXT_UID;
        this.primitive_shader = new PrimitiveShader(this.gl);
    }

    /**
     * Destroys this renderer.
     */
    destroy() {
        super.destroy();

        for (let i = 0; i < this.graphics_data_pool.length; ++i) {
            this.graphics_data_pool[i].destroy();
        }

        this.graphics_data_pool = null;
    }

    /**
     * Renders a graphics object.
     *
     * @param {Graphics} graphics - The graphics object to render.
     */
    render(graphics) {
        const renderer = this.renderer;
        const gl = renderer.gl;

        /** @type {WebGLGraphicsData} */
        let webgl_data = null;
        let webgl = graphics._webgl[this.CONTEXT_UID];

        if (!webgl || graphics.dirty !== webgl.dirty) {
            this.update_graphics(graphics);

            webgl = graphics._webgl[this.CONTEXT_UID];
        }

        // This  could be speeded up for sure!
        const shader = this.primitive_shader;

        renderer.bind_shader(shader);
        renderer.state.set_blend_mode(graphics.blend_mode);

        for (let i = 0, len = webgl.data.length; i < len; i++) {
            webgl_data = webgl.data[i];
            const shader_temp = webgl_data.shader;

            renderer.bind_shader(shader_temp);
            shader_temp.uniforms.translation_matrix = graphics.transform.world_transform.to_array(true);
            shader_temp.uniforms.tint = hex2rgb(graphics.tint);
            shader_temp.uniforms.alpha = graphics.world_alpha;

            renderer.bind_vao(webgl_data.vao);

            if (webgl_data.native_lines) {
                gl.drawArrays(gl.LINES, 0, webgl_data.points.length / 6);
            } else {
                webgl_data.vao.draw(gl.TRIANGLE_STRIP, webgl_data.indices.length);
            }
        }
    }

    /**
     * Updates the graphics object
     *
     * @param {Graphics} graphics - The graphics object to update
     */
    update_graphics(graphics) {
        const gl = this.renderer.gl;

        // get the contexts graphics object
        let webgl = graphics._webgl[this.CONTEXT_UID];

        // if the graphics object does not exist in the webGL context time to create it!
        if (!webgl) {
            webgl = graphics._webgl[this.CONTEXT_UID] = {
                last_index: 0,
                data: [],
                gl: gl,
                clear_dirty: -1,
                dirty: -1,
            };
        }

        // flag the graphics as not dirty as we are about to update it...
        webgl.dirty = graphics.dirty;

        // if the user cleared the graphics object we will need to clear every object
        if (graphics.clear_dirty !== webgl.clear_dirty) {
            webgl.clear_dirty = graphics.clear_dirty;

            // loop through and return all the webGLDatas to the object pool so than can be reused later on
            for (let i = 0; i < webgl.data.length; i++) {
                this.graphics_data_pool.push(webgl.data[i]);
            }

            // clear the array and reset the index..
            webgl.data.length = 0;
            webgl.last_index = 0;
        }

        /** @type {WebGLGraphicsData} */
        let webgl_data = null;
        /** @type {WebGLGraphicsData} */
        let webgl_data_native_lines = null;

        // loop through the graphics datas and construct each one..
        // if the object is a complex fill then the new stencil buffer technique will be used
        // other wise graphics objects will be pushed into a batch..
        for (let i = webgl.last_index; i < graphics.graphics_data.length; i++) {
            const data = graphics.graphics_data[i];

            // TODO - this can be simplified
            webgl_data = this.get_webgl_data(webgl);

            if (data.native_lines && data.line_width) {
                webgl_data_native_lines = this.get_webgl_data(webgl, true);
                webgl.last_index++;
            }

            if (data.type === SHAPES.POLY) {
                build_poly(data, webgl_data, webgl_data_native_lines);
            }
            if (data.type === SHAPES.RECT) {
                build_rectangle(data, webgl_data, webgl_data_native_lines);
            } else if (data.type === SHAPES.CIRC || data.type === SHAPES.ELIP) {
                build_circle(data, webgl_data, webgl_data_native_lines);
            } else if (data.type === SHAPES.RREC) {
                build_rounded_rectangle(data, webgl_data, webgl_data_native_lines);
            }

            webgl.last_index++;
        }

        this.renderer.bind_vao(null);

        // upload all the dirty data...
        for (let i = 0; i < webgl.data.length; i++) {
            webgl_data = webgl.data[i];

            if (webgl_data.dirty) {
                webgl_data.upload();
            }
        }
    }

    /**
     * @param {import('../graphics').GraphicRenderInfo} webgl - the current WebGL drawing context
     * @param {boolean} [native_lines] - indicate whether the webGLData use for native_lines.
     */
    get_webgl_data(webgl, native_lines = false) {
        let webgl_data = webgl.data[webgl.data.length - 1];

        if (!webgl_data || webgl_data.native_lines !== native_lines || webgl_data.points.length > 320000) {
            webgl_data = this.graphics_data_pool.pop()
                || new WebGLGraphicsData(this.renderer.gl, this.primitive_shader, this.renderer.state.attrib_state);
            webgl_data.native_lines = native_lines;
            webgl_data.reset();
            webgl.data.push(webgl_data);
        }

        webgl_data.dirty = true;

        return webgl_data;
    }
}
