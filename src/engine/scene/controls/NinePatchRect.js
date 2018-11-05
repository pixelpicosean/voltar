import Control from './Control';
import { Margin } from './const';
import Texture from 'engine/textures/Texture';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import { node_class_map } from 'engine/registry';
import { Vector2 } from 'engine/math/index';
import NineSlicePlane from '../mesh/NineSlicePlane';

/**
 * @enum {number}
 */
export const AxisStretchMode = {
    STRETCH: 0,
    TILE: 1,
    TILE_FIT: 2,
}

const tmp_vec = new Vector2();

export default class NinePatchRect extends Control {
    /**
     * The texture that the sprite is using
     *
     * @member {Texture}
     */
    get texture() {
        return this._texture;
    }
    set texture(p_value) {
        this.mesh.texture = p_value;
        this._texture = this.mesh.texture;

        this.minimum_size_changed();
        this.emit_signal('texture_changed');
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture(value) {
        // @ts-ignore
        this.texture = value;
        return this;
    }

    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_draw_center(value) {
        this.draw_center = value;
        return this;
    }

    /**
     * @param {number} value
     * @returns {this}
     */
    set_axis_stretch_horizontal(value) {
        this.axis_stretch_horizontal = value;
        return this;
    }

    /**
     * @param {number} value
     * @returns {this}
     */
    set_axis_stretch_vertical(value) {
        this.axis_stretch_vertical = value;
        return this;
    }

    get patch_margin_bottom() {
        return this.margin[Margin.Bottom];
    }
    set patch_margin_bottom(value) {
        this.margin[Margin.Bottom] = value;
        this.minimum_size_changed();

        this.mesh.bottom_height = value;
    }
    set_patch_margin_bottom(value) {
        this.patch_margin_bottom = value;
        return this;
    }

    get patch_margin_left() {
        return this.margin[Margin.Left];
    }
    set patch_margin_left(value) {
        this.margin[Margin.Left] = value;
        this.minimum_size_changed();

        this.mesh.left_width = value;
    }
    set_patch_margin_left(value) {
        this.patch_margin_left = value;
        return this;
    }

    get patch_margin_top() {
        return this.margin[Margin.Top];
    }
    set patch_margin_top(value) {
        this.margin[Margin.Top] = value;
        this.minimum_size_changed();

        this.mesh.top_height = value;
    }
    set_patch_margin_top(value) {
        this.patch_margin_top = value;
        return this;
    }

    get patch_margin_right() {
        return this.margin[Margin.Right];
    }
    set patch_margin_right(value) {
        this.margin[Margin.Right] = value;
        this.minimum_size_changed();

        this.mesh.right_width = value;
    }
    set_patch_margin_right(value) {
        this.patch_margin_right = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'NinePatchRect';

        this.margin = [0, 0, 0, 0];

        this._need_redraw = false;

        this.mesh = new NineSlicePlane(Texture.WHITE);

        this.draw_center = true;
        this.axis_stretch_horizontal = AxisStretchMode.STRETCH;
        this.axis_stretch_vertical = AxisStretchMode.STRETCH;

        /**
         * @type {Texture}
         */
        this._texture = null;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.draw_center !== undefined) {
            this.draw_center = data.draw_center;
        }

        if (data.axis_stretch_horizontal !== undefined) {
            this.axis_stretch_horizontal = data.axis_stretch_horizontal;
        }
        if (data.axis_stretch_vertical !== undefined) {
            this.axis_stretch_vertical = data.axis_stretch_vertical;
        }

        if (data.texture !== undefined) {
            this.texture = data.texture;
        }

        if (data.patch_margin_bottom !== undefined) {
            this.patch_margin_bottom = data.patch_margin_bottom;
        }
        if (data.patch_margin_left !== undefined) {
            this.patch_margin_left = data.patch_margin_left;
        }
        if (data.patch_margin_top !== undefined) {
            this.patch_margin_top = data.patch_margin_top;
        }
        if (data.patch_margin_right !== undefined) {
            this.patch_margin_right = data.patch_margin_right;
        }

        return this;
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        if (!this.draw_center && this._texture && this._texture.valid) {
            return size.set(this._texture.width, this._texture.height);
        }
        return size.set(0, 0);
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {WebGLRenderer} renderer - The webgl renderer to use.
     */
    _render_webgl(renderer) {
        this.mesh.transform.set_from_matrix(this.transform.world_transform);

        this.mesh._width = this.rect_size.x;
        this.mesh._height = this.rect_size.y;
        this.mesh._refresh();

        // TODO: sync more properties for rendering
        this.mesh._update_transform();
        this.mesh.tint = this.tint;
        this.mesh.alpha = this.alpha;
        this.mesh.blend_mode = this.blend_mode;

        this.mesh._render_webgl(renderer);
    }
}

node_class_map['NinePatchRect'] = NinePatchRect;
