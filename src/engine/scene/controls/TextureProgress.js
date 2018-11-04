import Range from "./Range";
import { Vector2, Rectangle, clamp } from "engine/math/index";
import { node_class_map } from "engine/registry";
import Color from "engine/Color";
import Texture from "engine/textures/Texture";
import { TextureCache } from "engine/utils/index";
import { Margin } from "./const";
import WebGLRenderer from "engine/renderers/WebGLRenderer";
import Sprite from "../sprites/Sprite";
import TilingSprite from "../sprites/TilingSprite";

const tmp_vec = new Vector2();

/**
 * @enum {number}
 */
export const FillMode = {
    LEFT_TO_RIGHT: 0,
    RIGHT_TO_LEFT: 1,
    TOP_TO_BOTTOM: 2,
    BOTTOM_TO_TOP: 3,
    CLOCKWISE: 4,
    COUNTER_CLOCKWISE: 5,
    BILINEAR_LEFT_AND_RIGHT: 6,
    BILINEAR_TOP_AND_BOTTOM: 7,
    CLOCKWISE_AND_COUNTER_CLOCKWISE: 8,
}

export default class TextureProgress extends Range {
    get nine_patch_stretch() {
        return this._nine_patch_stretch;
    }
    /**
     * @param {boolean} value
     */
    set nine_patch_stretch(value) {
        this._nine_patch_stretch = value;
        this.minimum_size_changed();
    }
    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_nine_patch_stretch(value) {
        this.nine_patch_stretch = value;
        return this;
    }

    get radial_center_offset() {
        return this._radial_center_offset;
    }
    /**
     * @param {Vector2} value
     */
    set radial_center_offset(value) {
        this._radial_center_offset.copy(value);
    }
    /**
     * @param {number|import("engine/math/Vector2").Vector2Like} x
     * @param {number} [y]
     * @returns {this}
     */
    set_radial_center_offset(x, y) {
        if (y !== undefined) {
            // @ts-ignore
            this.radial_center_offset.set(x, y);
        } else {
            // @ts-ignore
            this.radial_center_offset.copy(x);
        }

        return this;
    }

    get radial_fill_degrees() {
        return this._radial_fill_degrees;
    }
    /**
     * @param {number} value
     */
    set radial_fill_degrees(value) {
        this._radial_fill_degrees = clamp(value, 0, 360);
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_radial_fill_degrees(value) {
        this.radial_fill_degrees = value;
        return this;
    }

    get radial_initial_angle() {
        return this._radial_initial_angle;
    }
    /**
     * @param {number} value
     */
    set radial_initial_angle(value) {
        while (value > 360) {
            value -= 360;
        }
        while (value < 0) {
            value += 360;
        }
        this._radial_initial_angle = value;
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_radial_initial_angle(value) {
        this.radial_initial_angle = value;
        return this;
    }

    get stretch_margin_bottom() {
        return this.stretch_margin[Margin.Bottom];
    }
    /**
     * @param {number} value
     */
    set stretch_margin_bottom(value) {
        this.set_stretch_margin(Margin.Bottom, value);
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_stretch_margin_bottom(value) {
        this.stretch_margin_bottom = value;
        return this;
    }

    get stretch_margin_left() {
        return this.stretch_margin[Margin.Left];
    }
    /**
     * @param {number} value
     */
    set stretch_margin_left(value) {
        this.set_stretch_margin(Margin.Left, value);
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_stretch_margin_left(value) {
        this.stretch_margin_left = value;
        return this;
    }

    get stretch_margin_top() {
        return this.stretch_margin[Margin.Top];
    }
    /**
     * @param {number} value
     */
    set stretch_margin_top(value) {
        this.set_stretch_margin(Margin.Top, value);
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_stretch_margin_top(value) {
        this.stretch_margin_top = value;
        return this;
    }

    get stretch_margin_right() {
        return this.stretch_margin[Margin.Right];
    }
    /**
     * @param {number} value
     */
    set stretch_margin_right(value) {
        this.set_stretch_margin(Margin.Right, value);
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_stretch_margin_right(value) {
        this.stretch_margin_right = value;
        return this;
    }

    get tint_over() {
        return this._tint_over;
    }
    /**
     * @param {Color} value
     */
    set tint_over(value) {
        this._tint_over.set(value.r, value.g, value.b);
    }
    /**
     * @param {number|Color} r
     * @param {number} [g]
     * @param {number} [b]
     * @returns {this}
     */
    set_tint_over(r, g, b) {
        if (g !== undefined) {
            // @ts-ignore
            this._tint_over.set(r, g, b);
        } else {
            // @ts-ignore
            this._tint_over.set(r.r, r.g, r.b);
        }
        return this;
    }

    get tint_progress() {
        return this._tint_progress;
    }
    /**
     * @param {Color} value
     */
    set tint_progress(value) {
        this._tint_progress.set(value.r, value.g, value.b);
    }
    /**
     * @param {number|Color} r
     * @param {number} [g]
     * @param {number} [b]
     * @returns {this}
     */
    set_tint_progress(r, g, b) {
        if (g !== undefined) {
            // @ts-ignore
            this._tint_progress.set(r, g, b);
        } else {
            // @ts-ignore
            this._tint_progress.set(r.r, r.g, r.b);
        }
        return this;
    }

    get tint_under() {
        return this._tint_under;
    }
    /**
     * @param {Color} value
     */
    set tint_under(value) {
        this._tint_under.set(value.r, value.g, value.b);
    }
    /**
     * @param {number|Color} r
     * @param {number} [g]
     * @param {number} [b]
     * @returns {this}
     */
    set_tint_under(r, g, b) {
        if (g !== undefined) {
            // @ts-ignore
            this._tint_under.set(r, g, b);
        } else {
            // @ts-ignore
            this._tint_under.set(r.r, r.g, r.b);
        }
        return this;
    }

    get texture_over() {
        return this._texture_over;
    }
    /**
     * @param {string|Texture} value
     */
    set texture_over(value) {
        if (typeof (value) === 'string') {
            value = TextureCache[value];
        }
        // @ts-ignore
        this._texture_over = value;
        if (!this._texture_under) {
            this.minimum_size_changed();
        }
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture_over(value) {
        this.texture_over = value;
        return this;
    }

    get texture_progress() {
        return this._texture_progress;
    }
    /**
     * @param {string|Texture} value
     */
    set texture_progress(value) {
        if (typeof (value) === 'string') {
            value = TextureCache[value];
        }
        // @ts-ignore
        this._texture_progress = value;
        this.minimum_size_changed();
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture_progress(value) {
        this.texture_progress = value;
        return this;
    }

    get texture_under() {
        return this._texture_under;
    }
    /**
     * @param {string|Texture} value
     */
    set texture_under(value) {
        if (typeof (value) === 'string') {
            value = TextureCache[value];
        }
        // @ts-ignore
        this._texture_under = value;
        this.minimum_size_changed();
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture_under(value) {
        this.texture_under = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'TextureProgress';

        this.fill_mode = FillMode.LEFT_TO_RIGHT;
        this._nine_patch_stretch = false;

        /** @type {Texture} */
        this._texture_over = null;

        /** @type {Texture} */
        this._texture_progress = null;

        /** @type {Texture} */
        this._texture_under = null;

        this._radial_initial_angle = 0;
        this._radial_center_offset = new Vector2();
        this._radial_fill_degrees = 360;

        this.stretch_margin = [0, 0, 0, 0];

        this._tint_under = new Color(1, 1, 1);
        this._tint_progress = new Color(1, 1, 1);
        this._tint_over = new Color(1, 1, 1);

        this.sprite_under = new Sprite();
        this.sprite_progress = new TilingSprite();
        this.sprite_over = new Sprite();
    }
    _load_data(data) {
        super._load_data(data);

        if (data.fill_mode !== undefined) {
            this.fill_mode = data.fill_mode;
        }

        if (data.nine_patch_stretch !== undefined) {
            this.nine_patch_stretch = data.nine_patch_stretch;
        }

        if (data.radial_initial_angle !== undefined) {
            this.radial_initial_angle = data.radial_initial_angle;
        }
        if (data.radial_center_offset !== undefined) {
            this.radial_center_offset = data.radial_center_offset;
        }
        if (data.radial_fill_degrees !== undefined) {
            this.radial_fill_degrees = data.radial_fill_degrees;
        }

        if (data.stretch_margin_bottom !== undefined) {
            this.stretch_margin_bottom = data.stretch_margin_bottom;
        }
        if (data.stretch_margin_left !== undefined) {
            this.stretch_margin_left = data.stretch_margin_left;
        }
        if (data.stretch_margin_top !== undefined) {
            this.stretch_margin_top = data.stretch_margin_top;
        }
        if (data.stretch_margin_right !== undefined) {
            this.stretch_margin_right = data.stretch_margin_right;
        }

        if (data.texture_under !== undefined) {
            this.texture_under = data.texture_under;
        }
        if (data.texture_progress !== undefined) {
            this.texture_progress = data.texture_progress;
        }
        if (data.texture_over !== undefined) {
            this.texture_over = data.texture_over;
        }

        if (data.tint_under !== undefined) {
            this.tint_under = data.tint_under;
        }
        if (data.tint_progress !== undefined) {
            this.tint_progress = data.tint_progress;
        }
        if (data.tint_over !== undefined) {
            this.tint_over = data.tint_over;
        }

        return this;
    }

    set_stretch_margin(margin, size) {
        this.stretch_margin[margin] = size;
        this.minimum_size_changed();
    }

    /**
     * @param {Vector2} size
     * @returns {Vector2}
     */
    get_minimum_size(size) {
        if (this._nine_patch_stretch) {
            return size.set(
                this.stretch_margin[Margin.Left] + this.stretch_margin[Margin.Right],
                this.stretch_margin[Margin.Top] + this.stretch_margin[Margin.Bottom]
            );
        } else if (this._texture_under && this._texture_under.valid) {
            return size.set(this._texture_under.width, this._texture_under.height);
        } else if (this._texture_over && this._texture_over.valid) {
            return size.set(this._texture_over.width, this._texture_over.height);
        } else if (this._texture_progress && this._texture_progress.valid) {
            return size.set(this._texture_progress.width, this._texture_progress.height);
        }

        return size.set(1, 1);
    }

    /**
     * @param {WebGLRenderer} renderer
     */
    _render_webgl(renderer) {
        if (this._nine_patch_stretch && (this.fill_mode === FillMode.LEFT_TO_RIGHT || this.fill_mode === FillMode.RIGHT_TO_LEFT || this.fill_mode === FillMode.TOP_TO_BOTTOM || this.fill_mode === FillMode.BOTTOM_TO_TOP)) {
            if (this._texture_under && this._texture_under.valid) {
                // TODO: draw nine patch stretched
            }
            if (this._texture_progress && this._texture_progress.valid) {
                // TODO: draw nine patch stretched
            }
            if (this._texture_over && this._texture_over.valid) {
                // TODO: draw nine patch stretched
            }
        } else {
            if (this._texture_under && this._texture_under.valid) {
                this.sprite_under.transform.set_from_matrix(this.transform.world_transform);
                this.sprite_under._texture = this._texture_under;

                // TODO: sync more properties for rendering
                this.sprite_under._update_transform();
                this.sprite_under.tint = this._tint_under.as_hex();
                this.sprite_under.alpha = this.alpha;
                this.sprite_under.blend_mode = this.blend_mode;

                this.sprite_under._render_webgl(renderer);
            }
            if (this._texture_progress && this._texture_progress.valid) {
                this.sprite_progress.transform.set_from_matrix(this.transform.world_transform);
                this.sprite_progress.texture = this._texture_progress;

                const s = tmp_vec.set(this._texture_progress.width, this._texture_progress.height);
                switch (this.fill_mode) {
                    case FillMode.LEFT_TO_RIGHT: {
                        this.sprite_progress.width = Math.round(s.x * this.ratio);
                        this.sprite_progress.height = Math.round(s.y);
                    } break;
                    case FillMode.RIGHT_TO_LEFT: {
                        this.sprite_progress.width = Math.round(s.x * this.ratio);
                        this.sprite_progress.x += Math.round(s.x * (1 - this.ratio));
                        this.sprite_progress.tile_position.x = -this.sprite_progress.x;
                        this.sprite_progress.height = Math.round(s.y);
                    } break;
                    case FillMode.TOP_TO_BOTTOM: {
                        this.sprite_progress.width = Math.round(s.x);
                        this.sprite_progress.height = Math.round(s.y * this.ratio);
                    } break;
                    case FillMode.BOTTOM_TO_TOP: {
                        this.sprite_progress.width = Math.round(s.x);
                        this.sprite_progress.y += Math.round(s.y * (1 - this.ratio));
                        this.sprite_progress.tile_position.y = -this.sprite_progress.y;
                        this.sprite_progress.height = Math.round(s.y * this.ratio);
                    } break;
                    case FillMode.CLOCKWISE:
                    case FillMode.COUNTER_CLOCKWISE:
                    case FillMode.CLOCKWISE_AND_COUNTER_CLOCKWISE: {
                        // TODO: radial progress rendering
                    } break;
                    case FillMode.BILINEAR_LEFT_AND_RIGHT: {
                        this.sprite_progress.position.add(Math.round(s.x * 0.5 - s.x* this.ratio * 0.5), 0);
                        this.sprite_progress.tile_position.copy(this.sprite_progress.position);
                        this.sprite_progress.width = Math.round(s.x * this.ratio);
                        this.sprite_progress.height = Math.round(s.y);
                    } break;
                    case FillMode.BILINEAR_TOP_AND_BOTTOM: {
                        this.sprite_progress.position.add(0, Math.round(s.y * 0.5 - s.y * this.ratio * 0.5));
                        this.sprite_progress.tile_position.copy(this.sprite_progress.position);
                        this.sprite_progress.width = Math.round(s.y);
                        this.sprite_progress.height = Math.round(s.y * this.ratio);
                    } break;
                    default: {
                        this.sprite_progress.width = Math.round(s.x * this.ratio);
                        this.sprite_progress.height = Math.round(s.y);
                    } break;
                }

                // TODO: sync more properties for rendering
                this.sprite_progress._update_transform();
                this.sprite_progress.tint = this._tint_progress.as_hex();
                this.sprite_progress.alpha = this.alpha;
                this.sprite_progress.blend_mode = this.blend_mode;

                this.sprite_progress._render_webgl(renderer);
            }
            if (this._texture_over && this._texture_over.valid) {
                this.sprite_over.transform.set_from_matrix(this.transform.world_transform);
                this.sprite_over._texture = this._texture_over;

                // TODO: sync more properties for rendering
                this.sprite_over._update_transform();
                this.sprite_over.tint = this._tint_over.as_hex();
                this.sprite_over.alpha = this.alpha;
                this.sprite_over.blend_mode = this.blend_mode;

                this.sprite_over._render_webgl(renderer);
            }
        }
    }
}

node_class_map['TextureProgress'] = TextureProgress;
