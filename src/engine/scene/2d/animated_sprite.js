import { node_class_map, res_class_map } from 'engine/registry.js';
import { remove_items } from 'engine/dep/index.js';
import { GDCLASS } from 'engine/core/v_object.js';
import { Vector2, Vector2Like } from 'engine/core/math/vector2.js';
import { Rect2 } from 'engine/core/math/rect2.js';
import { Color } from 'engine/core/color.js';
import { Engine } from 'engine/core/engine.js';

import { ImageTexture } from '../resources/texture.js';

import { NOTIFICATION_INTERNAL_PROCESS } from '../main/node.js';
import { NOTIFICATION_DRAW } from './canvas_item.js';
import { Node2D } from './node_2d.js';

const White = new Color(1, 1, 1, 1);

class Anim {
    constructor() {
        this.speed = 5;
        this.loop = true;
        /**
         * @type {ImageTexture[]}
         */
        this.frames = [];
        this.name = '';
    }
}

class SpriteFrames {
    constructor() {
        /** @type {Object<string, Anim>} */
        this.animations = Object.create(null);
    }
    /**
     * @param {any} data
     */
    _load_data(data) {
        if (!data.animations) return this;

        for (const def of data.animations) {
            const anim = new Anim();

            anim.speed = def.speed;
            anim.loop = def.loop;
            anim.frames = def.frames;
            anim.name = def.name;

            this.animations[def.name] = anim;
        }
        return this;
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
     * @param {ImageTexture} texture
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
        this.animations = Object.create(null);
        this.add_animation('default');
    }
}
res_class_map['SpriteFrames'] = SpriteFrames;

export class AnimatedSprite extends Node2D {
    get class() { return 'AnimatedSprite' }

    get frames() { return this._frames }
    set frames(value) { this.set_frames(value) }
    /**
     * @param {SpriteFrames} p_frames
     */
    set_frames(p_frames) {
        this._frames = p_frames;
        if (p_frames) {
            this.set_frame(this._frame);
        } else {
            this._frame = 0;
        }

        this._reset_timeout();
        this.update();
    }

    get animation() { return this._animation }
    set animation(value) { this.set_animation(value) }
    /**
     * @param {string} anim
     */
    set_animation(anim) {
        if (this._animation === anim) {
            return;
        }

        this._animation = anim;
        this._reset_timeout();
        this.set_frame(0);
        this.update();
    }

    get frame() { return this._frame }
    set frame(value) { this.set_frame(value) }
    /**
     * @param {number} frame
     */
    set_frame(frame) {
        if (!this._frames) return;

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
        this.update();
        this.emit_signal('frame_changed');
    }

    get speed_scale() { return this._speed_scale }
    set speed_scale(value) { this.set_speed_scale(value) }
    /** @param {number} value */
    set_speed_scale(value) {
        const elapsed = this._get_frame_duration() - this.timeout;
        this._speed_scale = Math.max(value, 0);

        this._reset_timeout();
        this.timeout -= elapsed;
    }

    get playing() { return this._playing }
    set playing(value) { this.set_playing(value) }
    /**
     * @param {boolean} value
     */
    set_playing(value) {
        this._playing = true;
        this._set_playing(value);
    }

    get centered() { return this._centered }
    set centered(value) { this.set_centered(value) }
    /** @param {boolean} value */
    set_centered(value) {
        this._centered = value;
        this.update();
    }

    get offset() { return this._offset }
    set offset(value) { this.set_offset(value) }
    /**
     * @param {Vector2Like} value
     */
    set_offset(value) { this.set_offset_n(value.x, value.y) }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_offset_n(x, y) {
        this._offset.set(x, y);
        this.update();
    }

    get flip_h() { return this._flip_h }
    set flip_h(value) { this.set_flip_h(value) }
    /** @param {boolean} value */
    set_flip_h(value) {
        this._flip_h = value;
        this.update();
    }

    get flip_v() { return this._flip_v }
    set flip_v(value) { this.set_flip_v(value) }
    /** @param {boolean} value */
    set_flip_v(value) {
        this._flip_v = value;
        this.update();
    }

    constructor() {
        super();

        /** @type {SpriteFrames} */
        this._frames = null;
        this._playing = false;
        this.backwards = false;
        this._animation = 'default';
        this._frame = 0;
        this._speed_scale = 1;

        this._centered = true;
        this._offset = new Vector2;

        this.is_over = false;
        this.timeout = 0;

        this._flip_h = false;
        this._flip_v = false;
    }

    /* virtual */

    /**
     * @param {any} data
     */
    _load_data(data) {
        super._load_data(data);

        if (data.frames !== undefined) this.frames = data.frames;
        if (data.animation !== undefined) this.animation = data.animation;
        if (data.frame !== undefined) this.frame = data.frame;
        if (data.playing !== undefined) this.playing = data.playing;
        if (data.speed_scale !== undefined) this._speed_scale = data.speed_scale;
        if (data.centered !== undefined) this.centered = data.centered;
        if (data.offset !== undefined) this.offset = data.offset;
        if (data.flip_h !== undefined) this.flip_h = data.flip_h;
        if (data.flip_v !== undefined) this.flip_v = data.flip_v;

        return this;
    }
    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_INTERNAL_PROCESS: {
                if (!this._frames) return;
                if (!this._frames.has_animation(this._animation)) return;
                if (this._frame < 0) return;

                const speed = this._frames.get_animation_speed(this._animation) * this._speed_scale;
                if (speed === 0) return;

                let remaining = this.get_process_delta_time();

                while (remaining) {
                    if (this.timeout <= 0) {
                        this.timeout = this._get_frame_duration();

                        const fc = this._frames.get_frame_count(this._animation);
                        if ((!this.backwards && this._frame >= fc - 1) || (this.backwards && this._frame <= 0)) {
                            if (this._frames.get_animation_loop(this._animation)) {
                                if (this.backwards) {
                                    this._frame = fc - 1;
                                } else {
                                    this._frame = 0;
                                }

                                this.emit_signal('animation_finished');
                            } else {
                                if (this.backwards) {
                                    this._frame = 0;
                                } else {
                                    this._frame = fc - 1;
                                }

                                if (!this.is_over) {
                                    this.is_over = true;
                                    this.emit_signal('animation_finished');
                                }
                            }
                        } else {
                            if (this.backwards) {
                                this._frame -= 1;
                            } else {
                                this._frame += 1;
                            }
                        }

                        this.update();
                        this.emit_signal('frame_changed');
                    }

                    const to_process = Math.min(this.timeout, remaining);
                    remaining -= to_process;
                    this.timeout -= to_process;
                }
            } break;
            case NOTIFICATION_DRAW: {
                if (!this._frames) return;
                if (this._frame < 0) return;
                if (!this._frames.has_animation(this._animation)) return;

                const texture = this._frames.get_frame(this._animation, this._frame);
                if (!texture) return;

                const s = texture.get_size();
                const ofs = this._offset.clone();
                if (this._centered) {
                    ofs.subtract(s.x * 0.5, s.y * 0.5);
                }

                if (Engine.get_singleton().use_pixel_snap) {
                    ofs.floor();
                }
                const dst_rect = Rect2.new(ofs.x, ofs.y, s.x, s.y);

                if (this._flip_h) {
                    dst_rect.width = -dst_rect.width;
                }
                if (this._flip_v) {
                    dst_rect.height = -dst_rect.height;
                }

                const src_rect = Rect2.new(0, 0, s.x, s.y);
                texture.draw_rect_region(this.canvas_item, dst_rect, src_rect, White, false);

                Rect2.free(src_rect);
                Rect2.free(dst_rect);
                Vector2.free(ofs);
                Vector2.free(s);
            } break;
        }
    }

    /* public */

    /**
     * @param {string} [p_animation]
     * @param {boolean} [p_backwards]
     */
    play(p_animation, p_backwards = false) {
        this.backwards = p_backwards;

        if (p_animation) {
            this.set_animation(p_animation);
            if (p_backwards && this._frame === 0) {
                this.set_frame(this._frames.get_frame_count(p_animation) - 1);
            }
        }
        this._set_playing(true);
    }

    stop() {
        this._set_playing(false);
    }

    /* private */

    /**
     * @param {boolean} playing
     */
    _set_playing(playing) {
        if (this._playing === playing) {
            return;
        }
        this._playing = playing;
        this._reset_timeout();
        this.set_process_internal(playing);
    }

    _get_frame_duration() {
        if (this._frames && this._frames.has_animation(this._animation)) {
            const speed = this._frames.get_animation_speed(this._animation) * this._speed_scale;
            if (speed > 0) {
                return 1 / speed;
            }
        }
        return 0;
    }

    _reset_timeout() {
        if (!this._playing) {
            return;
        }

        this.timeout = this._get_frame_duration();
        this.is_over = false;
    }
}
node_class_map['AnimatedSprite'] = GDCLASS(AnimatedSprite, Node2D);
