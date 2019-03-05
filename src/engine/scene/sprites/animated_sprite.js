import { TextureCache, SpriteFramesCache } from 'engine/utils/index';
import { Rectangle } from 'engine/math/index';
import remove_items from 'remove-array-items';
import Texture from 'engine/textures/Texture';
import Sprite from './sprite';

export class Anim {
    constructor() {
        this.speed = 5;
        this.loop = true;
        /**
         * @type {Texture[]}
         */
        this.frames = [];
        this.name = '';
    }
}

/**
 * @param {Texture[]|string[]} frames
 */
function normalize_frame_list(frames) {
    /** @type {Texture[]} */
    const result = new Array(frames.length);
    for (let i = 0; i < result.length; i++) {
        result[i] = (/** @type {Texture} */(frames[i]).base_texture ? /** @type {Texture} */(frames[i]).base_texture : TextureCache[/** @type {string} */(frames[i])]);
    }
    return result;
}

/**
 * Create textures for tiles in a tileset. Can also be used to extract
 * grid based sprite-sheets.
 * @param  {Texture} tileset    Tileset texture.
 * @param  {number} width       Width of a single tile.
 * @param  {number} height      Height of a single tile.
 */
export function filmstrip(tileset, width, height) {
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
}

const SheetStripCache = Object.create(null);
const SheetSubStripCache = Object.create(null);

function parse_sheet_frames(sheet) {
    const tex = sheet.sheet.base_texture ? sheet.sheet : TextureCache[sheet.sheet];
    const key = `#${tex.uid}[${sheet.width}x${sheet.height}]`;
    let list = SheetStripCache[key];

    // Create a new strip list if not exist
    if (!Array.isArray(list)) {
        list = filmstrip(tex, sheet.width, sheet.height);
        Object.freeze(list);
        SheetStripCache[key] = list;
    }

    // Create sequence for this anim
    const sub_key = `${key}-(${sheet.sequence.toString()})`;
    let seq = SheetSubStripCache[sub_key];
    if (!Array.isArray(seq)) {
        seq = new Array(sheet.sequence.length);
        for (let i = 0; i < sheet.sequence.length; i++) {
            seq[i] = list[sheet.sequence[i]];
        }
        SheetSubStripCache[sub_key] = seq;
    }

    return seq;
}

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

    /**
     * @param {string} anim
     */
    add_animation(anim) {
        const a = new Anim();
        a.name = anim;
        this.animations[anim] = a;
    }
    /**
     * @param {string} anim
     */
    has_animation(anim) {
        return anim in this.animations;
    }
    /**
     * @param {string} anim
     */
    remove_animation(anim) {
        delete this.animations[anim];
    }
    /**
    * @param {string} prev
    * @param {string} next
    */
    rename_animation(prev, next) {
        const a = this.animations[prev];
        a.name = next;
        delete this.animations[prev];
        this.animations[next] = a;
    }

    /**
     * @param {string} anim
     * @param {number} fps
     */
    set_animation_speed(anim, fps) {
        this.animations[anim].speed = fps;
    }
    /**
     * @param {string} anim
     */
    get_animation_speed(anim) {
        return this.animations[anim].speed;
    }

    /**
     * @param {string} anim
     * @param {boolean} loop
     */
    set_animation_loop(anim, loop) {
        this.animations[anim].loop = loop;
    }
    /**
     * @param {string} anim
     */
    get_animation_loop(anim) {
        return this.animations[anim].loop;
    }

    /**
     * @param {string} anim
     */
    get_frame_count(anim) {
        return this.animations[anim].frames.length;
    }
    /**
     * @param {string} anim
     * @param {number} idx
     */
    get_frame(anim, idx) {
        return this.animations[anim].frames[idx];
    }
    /**
     * @param {string} anim
     * @param {number} idx
     * @param {Texture} texture
     */
    set_frame(anim, idx, texture) {
        this.animations[anim].frames[idx] = texture;
    }
    /**
     * @param {string} anim
     * @param {number} idx
     */
    remove_frame(anim, idx) {
        remove_items(this.animations[anim].frames, idx, 1);
    }
    /**
     * @param {string} anim
     */
    clear(anim) {
        this.animations[anim].frames.length = 0;
    }
    clear_all() {
        this.animations = {};
        this.add_animation('default');
    }
}

export default class AnimatedSprite extends Sprite {
    get frames() {
        return this._frames;
    }
    /**
     * @param {SpriteFrames} frames_p
     */
    set frames(frames_p) {
        let frames = null;
        if (typeof (frames_p) === 'string') {
            frames = new SpriteFrames(SpriteFramesCache[frames_p]);
        } else if (frames_p instanceof SpriteFrames) {
            frames = frames_p;
        } else {
            frames = new SpriteFrames(frames_p);
        }
        this._frames = frames;
    }
    /**
     * @param {SpriteFrames} value
     */
    set_frames(value) {
        this.frames = value;
        return this;
    }

    get animation() {
        return this._animation;
    }
    /**
     * @param {string} anim
     */
    set animation(anim) {
        if (this._animation === anim) {
            return;
        }

        this._animation = anim;
        this._reset_timeout();
        this.frame = 0;
    }

    get frame() {
        return this._frame;
    }
    /**
     * @param {number} frame
     */
    set frame(frame) {
        if (!this._frames) {
            return;
        }

        if (this._frames.has_animation(this._animation)) {
            const limit = this._frames.get_frame_count(this._animation);
            if (frame >= limit) {
                frame = limit - 1;
            }
        }

        if (frame < 0) {
            frame = 0;
        }

        if (frame === this._frame) {
            return;
        }

        this._frame = frame;
        this._reset_timeout();
        this._update_texture();
        this.emit_signal('frame_changed');
    }
    /**
     * @param {number} value
     */
    set_frame(value) {
        this.frame = value;
        return this;
    }

    get playing() {
        return this._playing;
    }
    set playing(value) {
        this._playing = true;
        this._set_playing(value);
    }
    /**
     * @param {boolean} value
     */
    set_playing(value) {
        this.playing = value;
        return this;
    }

    /**
     * An AnimatedSprite is a simple way to display an animation depicted by a list of textures.
     *
     * @param {SpriteFrames|Object|string} frames - frame and animation data
     */
    constructor(frames) {
        super(undefined);

        this.type = 'AnimatedSprite';

        this._frames = null;

        this.frames = frames;

        /**
         * Indicates if the AnimatedSprite is currently playing
         *
         * @type {boolean}
         * @readonly
         */
        this._playing = false;

        this._animation = 'default';
        /**
         * @type {number}
         */
        this._frame = 0;
        this.speed_scale = 1;

        this.timeout = 0;
        this.is_over = false;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.frames !== undefined) {
            this.frames = data.frames;
        }

        if (data.animation !== undefined) {
            this.animation = data.animation;
        }

        if (data.frame !== undefined) {
            this.frame = data.frame;
        }

        if (data.playing !== undefined) {
            this.playing = data.playing;
        }

        if (data.speed_scale !== undefined) {
            this.speed_scale = data.speed_scale;
        }

        return this;
    }

    /**
     * @param {string} [anim]
     * @param {boolean} [restart]
     */
    play(anim, restart = false) {
        if (anim && anim.length > 0) {
            this.animation = anim;
        }
        this._set_playing(true);
        if (restart) {
            this._frame = 0;
        }
        return this;
    }
    stop() {
        this.playing = false;
        return this;
    }

    _reset_timeout() {
        if (!this._playing) {
            return;
        }

        this.timeout = this._get_frame_duration();
        this.is_over = false;
    }
    /**
     * @param {boolean} playing
     */
    _set_playing(playing) {
        if (this._playing === playing) {
            return;
        }
        this._playing = playing;
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
        if (!this._frames) {
            super._propagate_process(delta);
            return;
        }
        if (!this._frames.has_animation(this._animation)) {
            super._propagate_process(delta);
            return;
        }
        if (this._frame < 0) {
            super._propagate_process(delta);
            return;
        }
        if (!this._playing) {
            super._propagate_process(delta);
            return;
        }

        const speed = this._frames.get_animation_speed(this._animation) * this.speed_scale;
        if (speed === 0) {
            super._propagate_process(delta);
            return;
        }

        let remaining = delta;

        while (remaining) {
            if (this.timeout <= 0) {
                this.timeout = this._get_frame_duration();

                const fc = this._frames.get_frame_count(this._animation);
                if (this._frame >= fc - 1) {
                    if (this._frames.get_animation_loop(this._animation)) {
                        this._frame = 0;
                        this.emit_signal('animation_finished');
                    } else {
                        this._frame = fc - 1;
                        if (!this.is_over) {
                            this.is_over = true;
                            this.emit_signal('animation_finished');
                        }
                    }
                } else {
                    this._frame++;
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
        let tex = this._frames.get_frame(this._animation, this._frame);
        // Frame texture is texture instance
        if (tex.base_texture) {
            this._texture = tex;
            this._texture_id = -1;
        }
        // Frame texture is string
        else {
            this._texture = TextureCache[tex];
            this._texture_id = -1;
        }
    }

    _get_frame_duration() {
        if (this._frames && this._frames.has_animation(this._animation)) {
            const speed = this._frames.get_animation_speed(this._animation) * this.speed_scale;
            if (speed > 0) {
                return 1 / speed;
            }
        }
        return 0;
    }

    /**
     * Stops the AnimatedSprite and destroys it
     *
     * @param {import('../node_2d').DestroyOption|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     */
    destroy(options) {
        this.stop();
        super.destroy(options);
    }
}
