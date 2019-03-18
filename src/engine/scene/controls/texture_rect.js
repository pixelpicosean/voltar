import Control from './control';
import Texture from 'engine/scene/resources/textures/texture';
import WebGLRenderer from 'engine/servers/visual/webgl_renderer';
import { node_class_map } from 'engine/registry';
import { Vector2 } from 'engine/core/math/index';
import Sprite from '../sprites/sprite';
import TilingSprite from '../sprites/tiling_sprite';

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
     * @type {Texture}
     */
    get texture() {
        return this._texture;
    }
    set texture(p_value) {
        this.sprite.texture = p_value;
        this.tsprite.texture = p_value;

        this._texture = this.sprite._texture;

        // wait for the texture to load
        if (this._texture.base_texture.has_loaded) {
            this._on_texture_update();
        } else {
            this._texture.connect_once('update', this._on_texture_update, this);
        }
    }
    /**
     * @param {string|Texture} value
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
        this.minimum_size_changed();
    }
    /**
     * @param {boolean} value
     */
    set_expand(value) {
        this.expand = value;
        return this;
    }

    get stretch_mode() {
        return this._stretch_mode;
    }
    /**
     * @param {number} value
     */
    set stretch_mode(value) {
        this._stretch_mode = value;
    }
    /**
     * @param {number} value
     */
    set_stretch_mode(value) {
        this.stretch_mode = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'TextureRect';

        this.sprite = new Sprite(); this.sprite.anchor.set(0, 0);
        this.tsprite = new TilingSprite(); this.tsprite.anchor.set(0, 0);

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
        this._update_minimum_size_cache();
    }

    /**
     * Renders the object using the WebGL renderer
     *
     * @private
     * @param {WebGLRenderer} renderer - The webgl renderer to use.
     */
    _render_webgl(renderer) {
        this.node2d_update_transform();

        let sprite = null;

        switch (this._stretch_mode) {
            case StretchMode.SCALE_ON_EXPAND:
            case StretchMode.SCALE:
            case StretchMode.KEEP:
            case StretchMode.KEEP_CENTERED: {
                sprite = this.sprite;

                sprite.transform.set_from_matrix(this.transform.world_transform);
                if (this._stretch_mode === StretchMode.KEEP_CENTERED) {
                    sprite.position.add(
                        (this.rect_size.x - this._texture.width) * 0.5,
                        (this.rect_size.y - this._texture.height) * 0.5
                    );
                }
                if (this._expand || this._stretch_mode === StretchMode.SCALE) {
                    sprite.width = this.rect_size.x;
                    sprite.height = this.rect_size.y;
                } else {
                    sprite.scale.copy(this.rect_scale);
                }

                // TODO: sync more properties for rendering
                sprite._update_transform();
                sprite.modulate.copy(this.modulate);
                sprite.self_modulate.copy(this.self_modulate);
                sprite._update_color();
                sprite.blend_mode = this.blend_mode;

                sprite._render_webgl(renderer);
            } break;
            case StretchMode.KEEP_ASPECT_CENTERED:
            case StretchMode.KEEP_ASPECT: {
                sprite = this.sprite;

                sprite.transform.set_from_matrix(this.transform.world_transform);
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

                sprite.position.add(ofs_x, ofs_y);
                sprite.width = tex_width;
                sprite.height = tex_height;

                // TODO: sync more properties for rendering
                sprite._update_transform();
                sprite.modulate.copy(this.modulate);
                sprite.self_modulate.copy(this.self_modulate);
                sprite._update_color();
                sprite.blend_mode = this.blend_mode;

                sprite._render_webgl(renderer);
            } break;
            case StretchMode.TILE: {
                sprite = this.tsprite;

                sprite.transform.set_from_matrix(this.transform.world_transform);
                sprite.width = this.rect_size.x;
                sprite.height = this.rect_size.y;

                // TODO: sync more properties for rendering
                sprite._update_transform();
                sprite.clamp_margin = -0.5;
                sprite.modulate.copy(this.modulate);
                sprite.self_modulate.copy(this.self_modulate);
                sprite._update_color();
                sprite.blend_mode = this.blend_mode;

                sprite._render_webgl(renderer);
            } break;
            case StretchMode.KEEP_ASPECT_COVERED: {
                sprite = this.tsprite;

                sprite.transform.set_from_matrix(this.transform.world_transform);
                sprite.width = this.rect_size.x;
                sprite.height = this.rect_size.y;

                const scale_size = tmp_vec.set(this.rect_size.x / this._texture.width, this.rect_size.y / this._texture.height);
                const scale = scale_size.x > scale_size.y ? scale_size.x : scale_size.y;
                sprite.tile_scale.set(scale, scale);
                sprite.tile_position.set(this._texture.width * scale, this._texture.height * scale)
                    .subtract(this.rect_size)
                    .scale(-0.5)

                // TODO: sync more properties for rendering
                sprite._update_transform();
                sprite.clamp_margin = -0.5;
                sprite.modulate.copy(this.modulate);
                sprite.self_modulate.copy(this.self_modulate);
                sprite._update_color();
                sprite.blend_mode = this.blend_mode;

                sprite._render_webgl(renderer);
            } break;
        }
    }
}

node_class_map['TextureRect'] = TextureRect;
