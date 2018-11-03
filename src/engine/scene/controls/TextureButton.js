import Texture from 'engine/textures/Texture';
import WebGLRenderer from 'engine/renderers/WebGLRenderer';
import { node_class_map } from 'engine/registry';
import { Vector2 } from 'engine/math/index';
import Sprite from '../sprites/Sprite';
import TilingSprite from '../sprites/TilingSprite';
import BaseButton, { DrawMode } from './BaseButton';

/**
 * @enum {number}
 */
export const StretchMode = {
    SCALE: 1,
    TILE: 2,
    KEEP: 3,
    KEEP_CENTERED: 4,
    KEEP_ASPECT: 5,
    KEEP_ASPECT_CENTERED: 6,
    KEEP_ASPECT_COVERED: 7,
}

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_vec3 = new Vector2();

export default class TextureButton extends BaseButton {
    /**
     * @member {Texture}
     */
    get texture_normal() {
        return this._texture_normal;
    }
    set texture_normal(p_value) {
        this.sprite.texture = p_value;

        this._texture_normal = this.sprite._texture;

        // wait for the texture to load
        if (this._texture_normal.base_texture.has_loaded) {
            this._on_texture_update();
        } else {
            this._texture_normal.once('update', this._on_texture_update, this);
        }
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture_normal(value) {
        // @ts-ignore
        this.texture_normal = value;
        return this;
    }

    /**
     * @member {Texture}
     */
    get texture_pressed() {
        return this._texture_pressed;
    }
    set texture_pressed(p_value) {
        this.sprite.texture = p_value;

        this._texture_pressed = this.sprite._texture;

        // wait for the texture to load
        if (this._texture_pressed.base_texture.has_loaded) {
            this._on_texture_update();
        } else {
            this._texture_pressed.once('update', this._on_texture_update, this);
        }
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture_pressed(value) {
        // @ts-ignore
        this.texture_pressed = value;
        return this;
    }

    /**
     * @member {Texture}
     */
    get texture_hover() {
        return this._texture_hover;
    }
    set texture_hover(p_value) {
        this.sprite.texture = p_value;

        this._texture_hover = this.sprite._texture;

        // wait for the texture to load
        if (this._texture_hover.base_texture.has_loaded) {
            this._on_texture_update();
        } else {
            this._texture_hover.once('update', this._on_texture_update, this);
        }
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture_hover(value) {
        // @ts-ignore
        this.texture_hover = value;
        return this;
    }

    /**
     * @member {Texture}
     */
    get texture_disabled() {
        return this._texture_disabled;
    }
    set texture_disabled(p_value) {
        this.sprite.texture = p_value;

        this._texture_disabled = this.sprite._texture;

        // wait for the texture to load
        if (this._texture_disabled.base_texture.has_loaded) {
            this._on_texture_update();
        } else {
            this._texture_disabled.once('update', this._on_texture_update, this);
        }
    }
    /**
     * @param {string|Texture} value
     * @returns {this}
     */
    set_texture_disabled(value) {
        // @ts-ignore
        this.texture_disabled = value;
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
        this._need_redraw = true;
    }
    /**
     * @param {number} value
     * @returns {this}
     */
    set_stretch_mode(value) {
        this.stretch_mode = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'TextureButton';

        this._need_redraw = false;
        this.sprite = new Sprite();
        this.tsprite = new TilingSprite();

        this._expand = false;
        this._stretch_mode = StretchMode.SCALE;
        this._tile = false;

        /** @type {Texture} */
        this._texture_normal = null;
        /** @type {Texture} */
        this._texture_pressed = null;
        /** @type {Texture} */
        this._texture_hover = null;
        /** @type {Texture} */
        this._texture_disabled = null;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.expand !== undefined) {
            this.expand = data.expand;
        }
        if (data.stretch_mode !== undefined) {
            this.stretch_mode = data.stretch_mode;
        }

        if (data.texture_normal !== undefined) {
            this.texture_normal = data.texture_normal;
        }
        if (data.texture_pressed !== undefined) {
            this.texture_pressed = data.texture_pressed;
        }
        if (data.texture_hover !== undefined) {
            this.texture_hover = data.texture_hover;
        }
        if (data.texture_disabled !== undefined) {
            this.texture_disabled = data.texture_disabled;
        }

        return this;
    }

    /**
     * @param {Vector2} size
     */
    get_minimum_size(size) {
        size = super.get_minimum_size(size);

        if (!this.expand) {
            if (this._texture_normal && this._texture_normal.valid) {
                return size.set(this._texture_normal.width, this._texture_normal.height);
            } else if (this._texture_pressed && this._texture_pressed.valid) {
                return size.set(this._texture_pressed.width, this._texture_pressed.height);
            } else if (this._texture_hover && this._texture_hover.valid) {
                return size.set(this._texture_hover.width, this._texture_hover.height);
            }
        }

        return size.abs();
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
        let texture = undefined;

        switch (this.get_draw_mode()) {
            case DrawMode.NORMAL: {
                texture = this._texture_normal;
            } break;
            case DrawMode.PRESSED: {
                if (this._texture_pressed && this._texture_pressed.valid) {
                    texture = this._texture_pressed;
                } else if (this._texture_hover && this._texture_hover.valid) {
                    texture = this._texture_hover;
                } else if (this._texture_normal && this._texture_normal.valid) {
                    texture = this._texture_normal;
                }
            } break;
            case DrawMode.HOVER: {
                if (this._texture_hover && this._texture_hover.valid) {
                    texture = this._texture_hover;
                } else {
                    if (this._texture_pressed && this._texture_pressed.valid && this.is_pressed()) {
                        texture = this._texture_pressed;
                    } else if (this._texture_normal && this._texture_normal.valid) {
                        texture = this._texture_normal;
                    }
                }
            } break;
            case DrawMode.DISABLED: {
                if (this._texture_disabled && this._texture_disabled.valid) {
                    texture = this._texture_disabled;
                } else if (this._texture_normal && this._texture_normal.valid) {
                    texture = this._texture_normal;
                }
            } break;
        }

        if (!texture) {
            return;
        }

        const ofs = tmp_vec2.set(0, 0);
        const size = tmp_vec3.set(texture.width, texture.height);
        this._tile = false;
        if (this._expand) {
            switch (this._stretch_mode) {
                case StretchMode.SCALE: {
                    size.copy(this.rect_size);
                } break;
                case StretchMode.TILE: {
                    size.copy(this.rect_size);
                    this._tile = true;
                } break;
                case StretchMode.KEEP_CENTERED: {
                    ofs.set(
                        (this.rect_size.x - texture.width) * 0.5,
                        (this.rect_size.x - texture.width) * 0.5
                    )
                } break;
                case StretchMode.KEEP_ASPECT_CENTERED:
                case StretchMode.KEEP_ASPECT: {
                    // TODO
                } break;
                case StretchMode.KEEP_ASPECT_CENTERED: {
                    // TODO
                } break;
            }
        }
        if (this._tile) {

        } else {
            this.sprite.transform.set_from_matrix(this.transform.world_transform);
            this.sprite.position.add(ofs);
            this.sprite.width = size.x;
            this.sprite.height = size.y;

            // TODO: sync more properties for rendering
            this.sprite._update_transform();
            this.sprite._texture = texture;
            this.sprite.tint = this.tint;
            this.sprite.alpha = this.alpha;
            this.sprite.blend_mode = this.blend_mode;

            this.sprite._render_webgl(renderer);
        }
        return;

        switch (this._stretch_mode) {
            case StretchMode.SCALE:
            case StretchMode.KEEP:
            case StretchMode.KEEP_CENTERED: {
                this.sprite.transform.set_from_matrix(this.transform.world_transform);
                if (this._stretch_mode === StretchMode.KEEP_CENTERED) {
                    this.sprite.position.add(
                        (this.rect_size.x - texture.width) * 0.5,
                        (this.rect_size.y - texture.height) * 0.5
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
                this.sprite._texture = texture;
                this.sprite.tint = this.tint;
                this.sprite.alpha = this.alpha;
                this.sprite.blend_mode = this.blend_mode;

                this.sprite._render_webgl(renderer);
            } break;
            case StretchMode.KEEP_ASPECT_CENTERED:
            case StretchMode.KEEP_ASPECT: {
                this.sprite.transform.set_from_matrix(this.transform.world_transform);
                let tex_width = texture.width * this.rect_size.y / texture.height;
                let tex_height = this.rect_size.y;

                if (tex_width > this.rect_size.x) {
                    tex_width = this.rect_size.x;
                    tex_height = texture.height * tex_width / texture.width;
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
                this.sprite._texture = texture;
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
                this.tsprite._texture = texture;
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

                const scale_size = tmp_vec.set(this.rect_size.x / texture.width, this.rect_size.y / texture.height);
                const scale = scale_size.x > scale_size.y ? scale_size.x : scale_size.y;
                this.tsprite.tile_scale.set(scale, scale);
                this.tsprite.tile_position.set(texture.width * scale, texture.height * scale)
                    .subtract(this.rect_size)
                    .scale(-0.5)

                // TODO: sync more properties for rendering
                this.tsprite._update_transform();
                this.tsprite._texture = texture;
                this.tsprite.clamp_margin = -0.5;
                this.tsprite.tint = this.tint;
                this.tsprite.alpha = this.alpha;
                this.tsprite.blend_mode = this.blend_mode;

                this.tsprite._render_webgl(renderer);
            } break;
        }
    }
}

node_class_map['TextureButton'] = TextureButton;
