import Control from './control';

import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import Texture from 'engine/scene/resources/textures/texture';
import Color from 'engine/core/color';

import { node_class_map } from 'engine/registry';
import { COLOR_MODES } from 'engine/const';


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

        this.color = new Color(1, 1, 1, 1);
        this.color_mode = COLOR_MODES.MULTIPLY;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.color) {
            this.set_color(data.color.r, data.color.g, data.color.b, data.color.a);
        }

        return this;
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

    _update_color() {
        if (this._destroyed || this.is_queued_for_deletion) return;

        const tmp_color = Color.new().copy(this.color);

        // Calculate real color
        if (this.parent) {
            tmp_color.multiply(this.parent.self_modulate).multiply(this.parent.modulate)
        }

        tmp_color.multiply(this.modulate).multiply(this.self_modulate)

        // Update our world alpha
        this.world_alpha = tmp_color.a;

        // Update our tint
        this.tint = tmp_color.as_hex();

        Color.free(tmp_color);
    }
    /**
     * @param {WebGLRenderer} renderer - The webgl renderer to use.
     */
    _render_webgl(renderer) {
        this.calculate_vertices();
        this._update_color();

        renderer.set_object_renderer(renderer.plugins[this.renderer_plugin]);
        renderer.plugins[this.renderer_plugin].render(this);
    }
}

node_class_map['ColorRect'] = ColorRect;
