import { hex2rgb } from 'engine/utils/index';
import { SHAPES } from 'engine/const';
import ObjectRenderer from 'engine/renderers/utils/ObjectRenderer';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import WebGLGraphicsData from './WebGLGraphicsData';
import PrimitiveShader from './shaders/PrimitiveShader';

import build_poly from './utils/build_poly';
import build_rectangle from './utils/build_rectangle';
import build_rounded_rectangle from './utils/build_rounded_rectangle';
import build_circle from './utils/build_circle';
import Graphics from '../Graphics';

/**
 * Renders the graphics object.
 */
export default class GraphicsRenderer extends ObjectRenderer {
    /**
     * @param {WebGLRenderer} renderer - The renderer this object renderer works for.
     */
    constructor(renderer) {
        super(renderer);

        this.graphics_data_pool = [];

        this.primitive_shader = null;

        this.gl = renderer.gl;

        // easy access!
        this.CONTEXT_UID = 0;
    }

    /**
     * Called when there is a WebGL context change
     *
     * @private
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
        ObjectRenderer.prototype.destroy.call(this);

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

        let webgl_data;
        let webgl = graphics._webgl[this.CONTEXT_UID];

        if (!webgl || graphics.dirty !== webgl.dirty) {
            this.update_graphics(graphics);

            webgl = graphics._webgl[this.CONTEXT_UID];
        }

        // This  could be speeded up for sure!
        const shader = this.primitive_shader;

        // @ts-ignore
        renderer.bind_shader(shader);
        renderer.state.set_blend_mode(graphics.blend_mode);

        for (let i = 0, n = webgl.data.length; i < n; i++) {
            webgl_data = webgl.data[i];
            const shader_temp = webgl_data.shader;

            renderer.bind_shader(shader_temp);
            shader_temp.uniforms.translationMatrix = graphics.transform.world_transform.to_array(true);
            shader_temp.uniforms.tint = hex2rgb(graphics.tint);
            shader_temp.uniforms.alpha = graphics.world_alpha;

            renderer.bind_vao(webgl_data.vao);

            if (webgl_data.native_lines) {
                gl.drawArrays(gl.LINES, 0, webgl_data.points.length / 6);
            }
            else {
                webgl_data.vao.draw(gl.TRIANGLE_STRIP, webgl_data.indices.length);
            }
        }
    }

    /**
     * Updates the graphics object
     *
     * @private
     * @param {Graphics} graphics - The graphics object to update
     */
    update_graphics(graphics) {
        const gl = this.renderer.gl;

        // get the contexts graphics object
        let webgl = graphics._webgl[this.CONTEXT_UID];

        // if the graphics object does not exist in the webGL context time to create it!
        if (!webgl) {
            webgl = graphics._webgl[this.CONTEXT_UID] = { lastIndex: 0, data: [], gl, clear_dirty: -1, dirty: -1 };
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
            webgl.lastIndex = 0;
        }

        let webgl_data;
        let webgl_data_native_lines;

        // loop through the graphics datas and construct each one..
        // if the object is a complex fill then the new stencil buffer technique will be used
        // other wise graphics objects will be pushed into a batch..
        for (let i = webgl.lastIndex; i < graphics.graphics_data.length; i++) {
            const data = graphics.graphics_data[i];

            // TODO - this can be simplified
            webgl_data = this.get_webgl_data(webgl, 0);

            if (data.native_lines && data.line_width) {
                webgl_data_native_lines = this.get_webgl_data(webgl, 0, true);
                webgl.lastIndex++;
            }

            if (data.type === SHAPES.POLY) {
                build_poly(data, webgl_data, webgl_data_native_lines);
            }
            if (data.type === SHAPES.RECT) {
                build_rectangle(data, webgl_data, webgl_data_native_lines);
            }
            else if (data.type === SHAPES.CIRC || data.type === SHAPES.ELIP) {
                build_circle(data, webgl_data, webgl_data_native_lines);
            }
            else if (data.type === SHAPES.RREC) {
                build_rounded_rectangle(data, webgl_data, webgl_data_native_lines);
            }

            webgl.lastIndex++;
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
     *
     * @private
     * @param {WebGLRenderingContext} gl - the current WebGL drawing context
     * @param {number} type - TODO @Alvin
     * @param {boolean} [native_lines=false] - indicate whether the webGLData use for native_lines.
     * @return {*} TODO
     */
    get_webgl_data(gl, type, native_lines) {
        // @ts-ignore
        let webGLData = gl.data[gl.data.length - 1];

        if (!webGLData || webGLData.native_lines !== native_lines || webGLData.points.length > 320000) {
            webGLData = this.graphics_data_pool.pop()
                // @ts-ignore
                || new WebGLGraphicsData(this.renderer.gl, this.primitive_shader, this.renderer.state.attribsState);
            webGLData.native_lines = native_lines;
            webGLData.reset(type);
            // @ts-ignore
            gl.data.push(webGLData);
        }

        webGLData.dirty = true;

        return webGLData;
    }
}
