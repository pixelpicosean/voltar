import Control from './Control';
import Texture from 'engine/textures/Texture';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import { rgb2hex } from 'engine/utils/index';
import { node_class_map } from 'engine/registry';
import Color from 'engine/Color';

export default class ColorRect extends Control {
    constructor() {
        super();

        this.type = 'ColorRect';
        this.renderer_plugin = 'sprite';

        /**
         * this is used to store the vertex data
         *
         * @private
         * @member {Float32Array}
         */
        this.vertex_data = new Float32Array(8);

        this._texture = Texture.WHITE;
        this._tint_rgb = null;

        this.color = new Color(1, 1, 1, 1, (rgb) => {
            let tint = rgb2hex(rgb);
            this._tint_rgb = (tint >> 16) + (tint & 0xff00) + ((tint & 0xff) << 16);
        }, this);
    }

    /**
     * @param {number} r
     * @param {number} [g]
     * @param {number} [b]
     * @param {number} [a]
     */
    set_color(r, g, b, a) {
        // 0xRRGGBB
        if (g === undefined) {
            this._tint_rgb = (r >> 16) + (r & 0xff00) + ((r & 0xff) << 16)
        } else {
            this.color.set(r, g, b, a);
        }
    }

    calculate_vertices() {
        const wt = this.transform.world_transform;
        const a = wt.a;
        const b = wt.b;
        const c = wt.c;
        const d = wt.d;
        const tx = wt.tx;
        const ty = wt.ty;
        const vertex_data = this.vertex_data;

        let w0 = 0;
        let w1 = 0;
        let h0 = 0;
        let h1 = 0;

        w1 = 0;
        w0 = w1 + this.rect_size.x;

        h1 = 0;
        h0 = h1 + this.rect_size.y;

        // xy
        vertex_data[0] = (a * w1) + (c * h1) + tx;
        vertex_data[1] = (d * h1) + (b * w1) + ty;

        // xy
        vertex_data[2] = (a * w0) + (c * h1) + tx;
        vertex_data[3] = (d * h1) + (b * w0) + ty;

        // xy
        vertex_data[4] = (a * w0) + (c * h0) + tx;
        vertex_data[5] = (d * h0) + (b * w0) + ty;

        // xy
        vertex_data[6] = (a * w1) + (c * h0) + tx;
        vertex_data[7] = (d * h0) + (b * w1) + ty;
    }
    /**
     *
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {WebGLRenderer} renderer - The webgl renderer to use.
     */
    _render_webgl(renderer) {
        this.calculate_vertices();

        renderer.set_object_renderer(renderer.plugins[this.renderer_plugin]);
        renderer.plugins[this.renderer_plugin].render(this);
    }
}

node_class_map['ColorRect'] = ColorRect;
