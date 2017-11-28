import Node2D from '../Node2D';
import Sprite from './Sprite';
import Texture from '../../textures/Texture';
import { Rectangle } from '../../math';
import { TextureCache } from '../../utils';

export default class NineSliceSprite extends Node2D {
    /**
     * @param {Texture|string} texture
     * @param {number} top     top size
     * @param {number} right   right size
     * @param {number} bottom  bottom size
     * @param {number} left    left size
     */
    constructor(texture, top, right, bottom, left) {
        super();

        this.type = 'NineSliceSprite';

        this.texture_left = left;
        this.texture_right = right;
        this.texture_top = top;
        this.texture_bottom = bottom;

        this._center_rect = new Rectangle(0,0,0,0);
        /** @type {number} */
        this._tint = 0xFFFFFF;
        /** @type {Texture} */
        this._texture = null;

        /** @type {Sprite} */
        this.c = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.n = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.s = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.w = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.e = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.nw = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.ne = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.sw = this.add_child(new Sprite());
        /** @type {Sprite} */
        this.se = this.add_child(new Sprite());

        this.texture = texture;
        this._update_visual();
    }
    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
                // Directly set
                // - Sprite
                case 'texture':
                case 'tint':
                case 'width':
                case 'height':
                case 'texture_left':
                case 'texture_right':
                case 'texture_top':
                case 'texture_bottom':
                    this[k] = data[k];
                    break;

                // Set vector
            }
        }
    }

    /**
     * Resize the sprite
     * @param {number} w
     * @param {number} h
     */
    resize(w, h) {
        this.width = w;
        this.height = h;
    }

    /**
     * The texture that the sprite is using
     *
     * @member {Texture}
     */
    get texture() {
        return this._texture;
    }
    set texture(p_value) {
        let value = p_value;
        if (this._texture === value) {
            return;
        }
        if (typeof(p_value) === 'string') {
            value = TextureCache[p_value];
        }
        this._texture = value;

        this._update_texture();
    }
    get tint() {
        return this._tint;
    }
    set tint(p_value) {
        this.n.tint
            = this.ne.tint
            = this.e.tint
            = this.se.tint
            = this.s.tint
            = this.sw.tint
            = this.w.tint
            = this.nw.tint
                = p_value;
    }
    get width() {
        return this._center_rect.width + this.texture_left + this.texture_right;
    }
    set width(p_value) {
        this._center_rect.width = p_value - this.texture_left - this.texture_right;
        this._update_visual();
    }
    get height() {
        return this._center_rect.height + this.texture_top + this.texture_bottom;
    }
    set height(p_value) {
        this._center_rect.height = p_value - this.texture_top - this.texture_bottom;
        this._update_visual();
    }

    _update_texture() {
        const left = this.texture_left;
        const right = this.texture_right;
        const top = this.texture_top;
        const bottom = this.texture_bottom;

        const frame = this._texture.frame;
        this._center_rect = new Rectangle(left, top, frame.width - left - right, frame.height - top - bottom);

        this.n.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x + left, frame.y, frame.width - left - right, top));
        this.c.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x + left, frame.y + top, frame.width - left - right, frame.height - top - bottom));
        this.s.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x + left, frame.y + frame.height - bottom, frame.width - left - right, bottom));
        this.w.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x, frame.y + top, left, frame.height - top - bottom));
        this.e.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x + frame.width - right, frame.y + top, right, frame.height - top - bottom));
        this.nw.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x, frame.y, left, top));
        this.ne.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x + frame.width - right, frame.y, right, top));
        this.sw.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x, frame.y + frame.height - bottom, left, bottom));
        this.se.texture = new Texture(this._texture.base_texture, new Rectangle(frame.x + frame.width - right, frame.y + frame.height - bottom, right, bottom));

        this._update_visual();
    }
    _update_visual() {
        this.c.width = this._center_rect.width;
        this.c.height = this._center_rect.height;
        this.c.position.set(this._center_rect.left, this._center_rect.top);

        this.n.width = this._center_rect.width;
        this.n.position.set(this._center_rect.left, 0);
        this.s.width = this._center_rect.width;
        this.s.position.set(this._center_rect.left, this._center_rect.bottom);
        this.w.height = this._center_rect.height;
        this.w.position.set(0, this._center_rect.top);
        this.e.height = this._center_rect.height;
        this.e.position.set(this._center_rect.right, this._center_rect.top);

        this.nw.position.set(0, 0);
        this.ne.position.set(this._center_rect.right, 0);

        this.sw.position.set(0, this._center_rect.bottom);
        this.se.position.set(this._center_rect.right, this._center_rect.bottom);
    }
}
