import Sprite from './Sprite';
import Texture from '../../textures/Texture';
import { TextureCache } from '../../utils';
import Signal from 'engine/Signal';
import remove_items from 'remove-array-items';
import { Rectangle } from '../../math';


class Anim {
    constructor() {
        this.speed = 5;
        this.loop = true;
        this.frames = [];
        this.name = '';
    }
};

function normalize_frame_list(frames) {
    let result = new Array(frames.length);
    for (let i = 0; i < result.length; i++) {
        result[i] = (frames[i].base_texture ? frames[i].base_texture : TextureCache[frames[i]]);
    }
    return result;
};

/**
 * Create textures for tiles in a tileset. Can also be used to extract
 * grid based sprite-sheets.
 * @param  {Texture} tilesetp   Tileset texture.
 * @param  {Number} width       Width of a single tile.
 * @param  {Number} height      Height of a single tile.
 * @return {Array<Texture>}     List of textures.
 */
function filmstrip(tileset, width, height) {
    let strip = [];

    let w = tileset.width;
    let h = tileset.height;
    let orig = tileset.orig;

    let sheet = tileset.base_texture;

    let cols = Math.floor(w / width);
    let rows = Math.floor(h / height);

    let q = 0, r = 0;
    for (r = 0; r < rows; r++) {
        for (q = 0; q < cols; q++) {
            strip.push(new Texture(sheet, new Rectangle(q * width + orig.x, r * height + orig.y, width, height)));
        }
    }

    return strip;
};

const SheetStripCache = Object.create(null);
const SheetSubStripCache = Object.create(null);

function parse_sheet_frames(sheet) {
    const tex = sheet.sheet.base_texture ? sheet.sheet : TextureCache[sheet.sheet];
    const key = `@${tex.uid}+${sheet.width}+${sheet.height}`;
    let list = SheetStripCache[key];

    // Create a new strip list if not exist
    if (!Array.isArray(list)) {
        list = filmstrip(tex, sheet.width, sheet.height);
        Object.freeze(list);
        SheetStripCache[key] = list;
    }

    // Create sequence for this anim
    const sub_key = `${key}_${sheet.sequence.toString()}`;
    let seq = SheetSubStripCache[sub_key];
    if (!Array.isArray(seq)) {
        seq = new Array(sheet.sequence.length);
        for (let i = 0; i < sheet.sequence.length; i++) {
            seq[i] = list[sheet.sequence[i]];
        }
        SheetSubStripCache[sub_key] = seq;
    }

    return seq;
};

export class SpriteFrames {
    constructor(data) {
        this.animations = Object.create(null);
        this.data = data;

        let name, pack;
        for (name in this.data) {
            const anim = new Anim();
            pack = this.data[name];

            anim.speed = pack.speed;
            anim.loop = pack.loop;
            anim.frames = pack.frames.sheet ? parse_sheet_frames(pack.frames) : pack.frames;
            anim.name = name;

            this.animations[name] = anim;
        }
    }

    add_animation(anim) {
        const a = new Anim();
        a.name = anim;
        this.animations[anim] = a;
    }
    has_animation(anim) {
        return anim in this.animations;
    }
    remove_animation(anim) {
        delete this.animations[anim];
    }
    rename_animation(prev, next) {
        const a = this.animations[prev];
        a.name = next;
        delete this.animations[prev];
        this.animations[next] = a;
    }

    set_animation_speed(anim, fps) {
        this.animations[anim].speed = fps;
    }
    get_animation_speed(anim) {
        return this.animations[anim].speed;
    }

    set_animation_loop(anim, loop) {
        this.animations[anim].loop = loop;
    }
    get_animation_loop(anim) {
        return this.animations[anim].loop;
    }

    get_frame_count(anim) {
        return this.animations[anim].frames.length;
    }
    get_frame(anim, idx) {
        return this.animations[anim].frames[idx];
    }
    set_frame(anim, idx, texture) {
        this.animations[anim].frames[idx] = texture;
    }
    remove_frame(anim, idx) {
        remove_items(this.animations[anim].frames, idx, 1);
    }
    clear(anim) {
        this.animations[anim].frames.length = 0;
    }
    clear_all() {
        this.animations = {};
        this.add_animation('default');
    }
}

/**
 * An AnimatedSprite is a simple way to display an animation depicted by a list of textures.
 *
 * ```js
 * let alien_images = ["image_sequence_01.png","image_sequence_02.png","image_sequence_03.png","image_sequence_04.png"];
 * let texture_array = [];
 *
 * for (let i=0; i < 4; i++)
 * {
 *      let texture = v.Texture.from_image(alien_images[i]);
 *      texture_array.push(texture);
 * };
 *
 * const data = new v.AnimatedSprite(texture_array);
 * ```
 *
 * @class
 * @extends v.Sprite
 */
export default class AnimatedSprite extends Sprite {
    /**
     * @param {SpriteFrames|Object} frames - frame and animation data
     */
    constructor(frames) {
        super(undefined);

        this.type = 'AnimatedSprite';

        this.frames = (frames instanceof SpriteFrames) ? frames : new SpriteFrames(frames);

        /**
         * Indicates if the AnimatedSprite is currently playing
         *
         * @member {boolean}
         * @readonly
         */
        this.playing = false;

        this.animation = '';
        this.frame = 0;

        this.timeout = 0;

        this.animation_finished = new Signal();
        this.frame_changed = new Signal();
    }

    play(anim) {
        if (anim && anim.length > 0) {
            this.set_animation(anim);
        }
        this._set_playing(true);
    }
    stop() {
        this._set_playing(false);
    }

    set_animation(anim) {
        if (this.animation === anim) {
            return;
        }

        this.animation = anim;
        this._reset_timeout();
        this.set_frame(0);
        this._update_texture();
    }
    get_frame() {
        return this.frame;
    }
    set_frame(frame) {
        if (!this.frames) {
            return;
        }

        if (this.frames.has_animation(this.animation)) {
            const limit = this.frames.get_frame_count(this.animation);
            if (frame >= limit) {
                frame = limit - 1;
            }
        }

        if (frame < 0) {
            frame = 0;
        }

        if (frame === this.frame) {
            return;
        }

        this.frame = frame;
        this._reset_timeout();
        this._update_texture();
        this.frame_changed.dispatch();
    }
    get_sprite_frames() {
        return this.frames;
    }
    set_sprite_frames(frames) {
        this.frames = (frames instanceof SpriteFrames) ? frames : new SpriteFrames(frames);

        this.set_frame(this.frame);
    }

    _reset_timeout() {
        if (!this.playing) {
            return;
        }
        if (!this.frames) {
            return;
        }

        if (this.frames.has_animation(this.animation)) {
            const speed = this.frames.get_animation_speed(this.animation);
            if (speed > 0) {
                this.timeout = 1.0 / speed;
            }
            else {
                this.timeout = 0;
            }
        }
        else {
            this.timeout = 0;
        }
    }
    _set_playing(playing) {
        if (this.playing === playing) {
            return;
        }
        this.playing = playing;

        this._reset_timeout();
    }

    /**
     * Updates the object transform for rendering.
     *
     * @private
     * @param {number} delta - Time since last tick.
     */
    _propagate_process(delta) {
        // Update animation
        if (!this.frames) {
            super._propagate_process(delta);
            return;
        }
        if (!this.frames.has_animation(this.animation)) {
            super._propagate_process(delta);
            return;
        }
        if (this.frame < 0) {
            super._propagate_process(delta);
            return;
        }

        const speed = this.frames.get_animation_speed(this.animation);
        if (speed === 0) {
            super._propagate_process(delta);
            return;
        }

        let remaining = delta;

        while (remaining) {
            if (this.timeout <= 0) {
                this.timeout = 1.0 / speed;

                const fc = this.frames.get_frame_count(this.animation);
                if (this.frame >= fc - 1) {
                    if (this.frames.get_animation_loop(this.animation)) {
                        this.frame = 0;
                    }
                    else {
                        this.frame = fc - 1;
                    }
                }
                else {
                    this.frame++;
                    if (this.frame === fc - 1) {
                        this.animation_finished.dispatch();
                    }
                }

                this._update_texture();
            }

            const to_process = Math.min(this.timeout, remaining);
            remaining -= to_process;
            this.timeout -= to_process;
        }

        super._propagate_process(delta);
    }

    /**
     * Updates the displayed texture to match the current frame index
     *
     * @private
     */
    _update_texture() {
        // let tex = this.frames.animations[this.animation].frames[this.frame];
        let tex = this.frames.get_frame(this.animation, this.frame);
        // Frame texture is texture instance
        if (tex.base_texture) {
            this._texture = tex;
            this._textureID = -1;
        }
        // Frame texture is string
        else {
            this._texture = TextureCache[tex];
            this._textureID = -1;
        }
    }

    /**
     * Stops the AnimatedSprite and destroys it
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param {boolean} [options.children=false] - if set to true, all the children will have their destroy
     *      method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Should it destroy the current texture of the sprite as well
     * @param {boolean} [options.base_texture=false] - Should it destroy the base texture of the sprite as well
     */
    destroy(options) {
        this.stop();
        super.destroy(options);
    }
}
