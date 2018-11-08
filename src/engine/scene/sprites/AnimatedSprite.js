import { TextureCache, SpriteFramesCache } from 'engine/utils/index';
import { Rectangle } from 'engine/math/index';
import remove_items from 'remove-array-items';
import Texture from 'engine/textures/Texture';
import Sprite from './Sprite';

export class Anim {
    constructor() {
        this.speed = 5;
        this.loop = true;
        this.frames = [];
        this.name = '';
    }
}

function normalize_frame_list(frames) {
    let result = new Array(frames.length);
    for (let i = 0; i < result.length; i++) {
        result[i] = (frames[i].base_texture ? frames[i].base_texture : TextureCache[frames[i]]);
    }
    return result;
}

/**
 * Create textures for tiles in a tileset. Can also be used to extract
 * grid based sprite-sheets.
 * @param  {Texture} tileset    Tileset texture.
 * @param  {Number} width       Width of a single tile.
 * @param  {Number} height      Height of a single tile.
 * @return {Array<Texture>}     List of textures.
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

export default class AnimatedSprite extends Sprite {
    get frames() {
        return this._frames;
    }
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
    set_frames(value) {
        this.frames = value;
        return this;
    }

    get animation() {
        return this._animation;
    }
    set animation(anim) {
        if (this._animation === anim) {
            return;
        }

        this._animation = anim;
        this._reset_timeout();
        this._frame = 0;
        this._update_texture();
    }

    get frame() {
        return this._frame;
    }
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

        this._animation = '';
        this._frame = 0;
        this.speed_scale = 1;

        this.timeout = 0;
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

    play(anim, restart = false) {
        if (anim && anim.length > 0) {
            this._animation = anim;
        }
        this._set_playing(true);
        if (restart) {
            this._frame = 0;
        }
    }
    stop() {
        this._set_playing(false);
    }

    _reset_timeout() {
        if (!this.playing) {
            return;
        }
        if (!this._frames) {
            return;
        }

        if (this._frames.has_animation(this.animation)) {
            const speed = this._frames.get_animation_speed(this.animation);
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

        const speed = this._frames.get_animation_speed(this._animation);
        if (speed === 0) {
            super._propagate_process(delta);
            return;
        }

        let remaining = delta * this.speed_scale;

        while (remaining) {
            if (this.timeout <= 0) {
                this.timeout = 1.0 / speed;

                const fc = this._frames.get_frame_count(this._animation);
                if (this._frame >= fc - 1) {
                    if (this._frames.get_animation_loop(this._animation)) {
                        this._frame = 0;
                    }
                    else {
                        this._frame = fc - 1;
                    }
                }
                else {
                    this._frame++;
                    if (this._frame === fc - 1) {
                        this.emit_signal('animation_finished');
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

    /**
     * Stops the AnimatedSprite and destroys it
     *
     * @param {import('../Node2D').DestroyOption|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     */
    destroy(options) {
        this.stop();
        super.destroy(options);
    }
}
