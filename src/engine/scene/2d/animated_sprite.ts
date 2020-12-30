import { node_class_map, res_class_map } from 'engine/registry';
import { remove_items } from 'engine/dep/index';
import { GDCLASS } from 'engine/core/v_object';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2.js';
import { Color } from 'engine/core/color';
import { Engine } from 'engine/core/engine';

import { ImageTexture } from '../resources/texture.js';

import { NOTIFICATION_INTERNAL_PROCESS } from '../main/node';
import { NOTIFICATION_DRAW } from './canvas_item';
import { Node2D } from './node_2d';

const White = new Color(1, 1, 1, 1);

class Anim {
    speed = 5;
    loop = true;
    frames: ImageTexture[] = [];
    name = '';
}

class SpriteFrames {
    animations: { [s: string]: Anim } = Object.create(null);

    _load_data(data: any) {
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
    add_animation(anim: string) {
        const a = new Anim();
        a.name = anim;
        this.animations[anim] = a;
    }
    /**
     * @param {string} anim
     */
    has_animation(anim: string) {
        return anim in this.animations;
    }
    /**
     * @param {string} anim
     */
    remove_animation(anim: string) {
        delete this.animations[anim];
    }
    /**
    * @param {string} prev
    * @param {string} next
    */
    rename_animation(prev: string, next: string) {
        const a = this.animations[prev];
        a.name = next;
        delete this.animations[prev];
        this.animations[next] = a;
    }

    /**
     * @param {string} anim
     * @param {number} fps
     */
    set_animation_speed(anim: string, fps: number) {
        this.animations[anim].speed = fps;
    }
    /**
     * @param {string} anim
     */
    get_animation_speed(anim: string) {
        return this.animations[anim].speed;
    }

    /**
     * @param {string} anim
     * @param {boolean} loop
     */
    set_animation_loop(anim: string, loop: boolean) {
        this.animations[anim].loop = loop;
    }
    /**
     * @param {string} anim
     */
    get_animation_loop(anim: string) {
        return this.animations[anim].loop;
    }

    /**
     * @param {string} anim
     */
    get_frame_count(anim: string) {
        return this.animations[anim].frames.length;
    }
    /**
     * @param {string} anim
     * @param {number} idx
     */
    get_frame(anim: string, idx: number) {
        return this.animations[anim].frames[idx];
    }
    /**
     * @param {string} anim
     * @param {number} idx
     * @param {ImageTexture} texture
     */
    set_frame(anim: string, idx: number, texture: ImageTexture) {
        this.animations[anim].frames[idx] = texture;
    }
    /**
     * @param {string} anim
     * @param {number} idx
     */
    remove_frame(anim: string, idx: number) {
        remove_items(this.animations[anim].frames, idx, 1);
    }
    /**
     * @param {string} anim
     */
    clear(anim: string) {
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

    set_frames(p_frames: SpriteFrames) {
        this.frames = p_frames;
        if (p_frames) {
            this.set_frame(this.frame);
        } else {
            this.frame = 0;
        }

        this._reset_timeout();
        this.update();
    }

    /**
     * @param {string} anim
     */
    set_animation(anim: string) {
        if (this.animation === anim) {
            return;
        }

        this.animation = anim;
        this._reset_timeout();
        this.set_frame(0);
        this.update();
    }

    /**
     * @param {number} frame
     */
    set_frame(frame: number) {
        if (!this.frames) return;

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
        this.update();
        this.emit_signal('frame_changed');
    }

    /** @param {number} value */
    set_speed_scale(value: number) {
        const elapsed = this._get_frame_duration() - this.timeout;
        this.speed_scale = Math.max(value, 0);

        this._reset_timeout();
        this.timeout -= elapsed;
    }

    /**
     * @param {boolean} value
     */
    set_playing(value: boolean) {
        this.playing = true;
        this._set_playing(value);
    }

    /** @param {boolean} value */
    set_centered(value: boolean) {
        this.centered = value;
        this.update();
    }

    /**
     * @param {Vector2Like} value
     */
    set_offset(value: Vector2Like) { this.set_offset_n(value.x, value.y) }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_offset_n(x: number, y: number) {
        this.offset.set(x, y);
        this.update();
    }

    /** @param {boolean} value */
    set_flip_h(value: boolean) {
        this.flip_h = value;
        this.update();
    }

    /** @param {boolean} value */
    set_flip_v(value: boolean) {
        this.flip_v = value;
        this.update();
    }

    frames: SpriteFrames = null;
    playing = false;
    backwards = false;
    animation = 'default';
    frame = 0;
    speed_scale = 1;

    centered = true;
    offset = new Vector2;

    is_over = false;
    timeout = 0;

    flip_h = false;
    flip_v = false;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.frames !== undefined) this.set_frames(data.frames);
        if (data.animation !== undefined) this.set_animation(data.animation);
        if (data.frame !== undefined) this.set_frame(data.frame);
        if (data.playing !== undefined) this.set_playing(data.playing);
        if (data.speed_scale !== undefined) this.set_speed_scale(data.speed_scale);
        if (data.centered !== undefined) this.set_centered(data.centered);
        if (data.offset !== undefined) this.set_offset(data.offset);
        if (data.flip_h !== undefined) this.set_flip_h(data.flip_h);
        if (data.flip_v !== undefined) this.set_flip_v(data.flip_v);

        return this;
    }
    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_INTERNAL_PROCESS: {
                if (!this.frames) return;
                if (!this.frames.has_animation(this.animation)) return;
                if (this.frame < 0) return;

                const speed = this.frames.get_animation_speed(this.animation) * this.speed_scale;
                if (speed === 0) return;

                let remaining = this.get_process_delta_time();

                while (remaining) {
                    if (this.timeout <= 0) {
                        this.timeout = this._get_frame_duration();

                        const fc = this.frames.get_frame_count(this.animation);
                        if ((!this.backwards && this.frame >= fc - 1) || (this.backwards && this.frame <= 0)) {
                            if (this.frames.get_animation_loop(this.animation)) {
                                if (this.backwards) {
                                    this.frame = fc - 1;
                                } else {
                                    this.frame = 0;
                                }

                                this.emit_signal('animation_finished');
                            } else {
                                if (this.backwards) {
                                    this.frame = 0;
                                } else {
                                    this.frame = fc - 1;
                                }

                                if (!this.is_over) {
                                    this.is_over = true;
                                    this.emit_signal('animation_finished');
                                }
                            }
                        } else {
                            if (this.backwards) {
                                this.frame -= 1;
                            } else {
                                this.frame += 1;
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
                if (!this.frames) return;
                if (this.frame < 0) return;
                if (!this.frames.has_animation(this.animation)) return;

                const texture = this.frames.get_frame(this.animation, this.frame);
                if (!texture) return;

                const s = texture.get_size();
                const ofs = this.offset.clone();
                if (this.centered) {
                    ofs.subtract(s.x * 0.5, s.y * 0.5);
                }

                if (Engine.get_singleton().use_pixel_snap) {
                    ofs.floor();
                }
                const dst_rect = Rect2.create(ofs.x, ofs.y, s.x, s.y);

                if (this.flip_h) {
                    dst_rect.width = -dst_rect.width;
                }
                if (this.flip_v) {
                    dst_rect.height = -dst_rect.height;
                }

                const src_rect = Rect2.create(0, 0, s.x, s.y);
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
    play(p_animation: string, p_backwards: boolean = false) {
        this.backwards = p_backwards;

        if (p_animation) {
            this.set_animation(p_animation);
            if (p_backwards && this.frame === 0) {
                this.set_frame(this.frames.get_frame_count(p_animation) - 1);
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
    _set_playing(playing: boolean) {
        if (this.playing === playing) {
            return;
        }
        this.playing = playing;
        this._reset_timeout();
        this.set_process_internal(playing);
    }

    _get_frame_duration() {
        if (this.frames && this.frames.has_animation(this.animation)) {
            const speed = this.frames.get_animation_speed(this.animation) * this.speed_scale;
            if (speed > 0) {
                return 1 / speed;
            }
        }
        return 0;
    }

    _reset_timeout() {
        if (!this.playing) {
            return;
        }

        this.timeout = this._get_frame_duration();
        this.is_over = false;
    }
}
node_class_map['AnimatedSprite'] = GDCLASS(AnimatedSprite, Node2D);
