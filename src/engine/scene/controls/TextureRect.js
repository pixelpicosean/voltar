import Control from './Control';
import Texture from 'engine/textures/Texture';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import { node_class_map } from 'engine/registry';
import { Vector2 } from 'engine/math/index';
import Sprite from '../sprites/Sprite';
import TilingSprite from '../sprites/TilingSprite';

/**
 * @enum {number}
 */
export const StretchMode = {
    SCALE_ON_EXPAND: 0,
    SCALE: 1,
    TILE: 2,
    KEEP: 3,
    KEEP_CENTERED: 4,
    KEEP_ASPECT: 5,
    KEEP_ASPECT_CENTERED: 6,
    KEEP_ASPECT_COVERED: 7,
}

const tmp_vec = new Vector2();

export default class TextureRect extends Control {
    /**
     * The texture that the sprite is using
     *
     * @member {Texture}
     */
    get texture() {
        return this._texture;
    }
    set texture(p_value) {
        this.sprite.texture = p_value;
        this.tsprite.texture = p_value;

        this._texture = this.sprite._texture;
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

    get expand() {
        return this._expand;
    }
    /**
     * @param {boolean} value
     */
    set expand(value) {
        this._expand = value;
        this._need_redraw = true;
        this.minimum_size_changed();
    }
    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_expand(value) {
        this.expand = value;
    }

    get stretch_mode() {
        return this._stretch_mode;
    }
    /**
     * @param {number} value
     */
    set stretch_mode(value) {
        this._stretch_mode = value;
        this._need_redraw = true;
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_stretch_mode(value) {
        this.stretch_mode = value;
    }

    constructor() {
        super();

        this.type = 'TextureRect';

        this._need_redraw = false;
        this.sprite = new Sprite();
        this.tsprite = new TilingSprite();

        this._expand = false;
        this._stretch_mode = StretchMode.SCALE_ON_EXPAND;

        /**
         * @type {Texture}
         */
        this._texture = null;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.expand !== undefined) {
            this.expand = data.expand;
        }
        if (data.stretch_mode !== undefined) {
            this.stretch_mode = data.stretch_mode;
        }
        if (data.texture !== undefined) {
            this.texture = data.texture;
        }

        return this;
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        if (!this.expand && this._texture && this._texture.valid) {
            return size.set(this._texture.width, this._texture.height);
        }
        return size.set(0, 0);
    }

    _on_texture_update() {
        this._texture_id = -1;
        this._texture_trimmed_id = -1;

        this._need_redraw = true;

        this.minimum_size_changed();
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {WebGLRenderer} renderer - The webgl renderer to use.
     */
    _render_webgl(renderer) {
        switch (this._stretch_mode) {
            case StretchMode.SCALE_ON_EXPAND:
            case StretchMode.SCALE:
            case StretchMode.KEEP:
            case StretchMode.KEEP_CENTERED: {
                this.sprite.transform.set_from_matrix(this.transform.world_transform);
                if (this._stretch_mode === StretchMode.KEEP_CENTERED) {
                    this.sprite.position.add(
                        (this.rect_size.x - this._texture.width) * 0.5,
                        (this.rect_size.y - this._texture.height) * 0.5
                    );
                }
                if (this._expand || this._stretch_mode === StretchMode.SCALE) {
                    this.sprite.width = this.rect_size.x;
                    this.sprite.height = this.rect_size.y;
                } else {
                    this.sprite.scale.set(1, 1);
                }

                // TODO: sync more properties for rendering
                this.sprite._update_transform();
                this.sprite.tint = this.tint;
                this.sprite.alpha = this.alpha;
                this.sprite.blend_mode = this.blend_mode;

                this.sprite._render_webgl(renderer);
            } break;
            case StretchMode.KEEP_ASPECT_CENTERED:
            case StretchMode.KEEP_ASPECT: {
                this.sprite.transform.set_from_matrix(this.transform.world_transform);
                let tex_width = this._texture.width * this.rect_size.y / this._texture.height;
                let tex_height = this.rect_size.y;

                if (tex_width > this.rect_size.x) {
                    tex_width = this.rect_size.x;
                    tex_height = this._texture.height * tex_width / this._texture.width;
                }

                let ofs_x = 0;
                let ofs_y = 0;

                if (this._stretch_mode === StretchMode.KEEP_ASPECT_CENTERED) {
                    ofs_x += (this.rect_size.x - tex_width) * 0.5;
                    ofs_y += (this.rect_size.y - tex_height) * 0.5;
                }

                this.sprite.position.add(ofs_x, ofs_y);
                this.sprite.width = tex_width;
                this.sprite.height = tex_height;

                // TODO: sync more properties for rendering
                this.sprite._update_transform();
                this.sprite.tint = this.tint;
                this.sprite.alpha = this.alpha;
                this.sprite.blend_mode = this.blend_mode;

                this.sprite._render_webgl(renderer);
            } break;
            case StretchMode.TILE: {
                this.tsprite.transform.set_from_matrix(this.transform.world_transform);
                this.tsprite.width = this.rect_size.x;
                this.tsprite.height = this.rect_size.y;

                // TODO: sync more properties for rendering
                this.tsprite._update_transform();
                this.tsprite.clamp_margin = -0.5;
                this.tsprite.tint = this.tint;
                this.tsprite.alpha = this.alpha;
                this.tsprite.blend_mode = this.blend_mode;

                this.tsprite._render_webgl(renderer);
            } break;
            case StretchMode.KEEP_ASPECT_COVERED: {
                this.tsprite.transform.set_from_matrix(this.transform.world_transform);
                this.tsprite.width = this.rect_size.x;
                this.tsprite.height = this.rect_size.y;

                const scale_size = tmp_vec.set(this.rect_size.x / this._texture.width, this.rect_size.y / this._texture.height);
                const scale = scale_size.x > scale_size.y ? scale_size.x : scale_size.y;
                this.tsprite.tile_scale.set(scale, scale);
                this.tsprite.tile_position.set(this._texture.width * scale, this._texture.height * scale)
                    .subtract(this.rect_size)
                    .scale(-0.5)

                // TODO: sync more properties for rendering
                this.tsprite._update_transform();
                this.tsprite.clamp_margin = -0.5;
                this.tsprite.tint = this.tint;
                this.tsprite.alpha = this.alpha;
                this.tsprite.blend_mode = this.blend_mode;

                this.tsprite._render_webgl(renderer);
            } break;
        }
    }
}

node_class_map['TextureRect'] = TextureRect;
