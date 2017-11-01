import Signal from 'engine/Signal';
import Sprite from '../Sprite';

import { Entity, Animation, Obj } from './Model';
import { FrameData } from './FrameData';
import { TextureProvider, FrameDataProvider } from './Provider';


export default class Animator {
    get progress() {
        return this.time / this.length;
    }
    set progress(value) {
        this.time = value * this.length;
    }

    /**
     * @param {Entity} entity 
     */
    constructor(entity) {
        this.animation_finished = new Signal();

        /**
         * @type {Entity}
         */
        this.entity = entity;

        /**
         * @type {Animation}
         */
        this.current_animation = null;

        /**
         * @type {Animation}
         */
        this.next_animation = null;

        /**
         * @type {string}
         */
        this.name = '';

        /**
         * @type {number}
         */
        this.speed = 1;

        /**
         * @type {number}
         */
        this.length = 0;

        /**
         * @type {number}
         */
        this.time = 0;

        this.data_provider = new FrameDataProvider();
        this.sprite_provider = new TextureProvider();

        /**
         * @type {FrameData}
         */
        this.frame_data = null;

        /**
         * @type {Object}
         */
        this.animations = entity.get_animations();

        this._total_transition_time = 0;
        this._transition_time = 0;
        this._factor = 0;
    }

    /**
     * @returns {Array<string>}
     */
    get_animations() {
        return Object.keys(this.animations);
    }

    /**
     * Play the animation with given name, from beginning
     * @param {string} name 
     */
    play(name) {
        this.progress = 0;

        this.current_animation = this.animations[name];
        this.name = name;

        this.next_animation = null;
        this.length = this.current_animation.length;
    }

    /**
     * Transition to give animation oding a progressive blend
     * @param {string} name 
     * @param {number} total_transition_time 
     */
    transition(name, total_transition_time) {
        this._total_transition_time = total_transition_time;
        this._transition_time = 0;
        this._factor = 0;
        this.next_animation = this.animations[name];
    }

    /**
     * @param {string} first 
     * @param {string} second
     * @param {number} factor 
     */
    blend(first, second, factor) {
        this.play(first);
        this.next_animation = this.animations[second];
        this._total_transition_time = 0;
        this._factor = factor;
    }

    /**
     * @param {number} delta 
     */
    update(delta) {
        if (!this.current_animation) {
            this.play(this.get_animations()[0]);
        }

        let initial_time = this.time;
        let elapsed = delta * this.speed;

        if (this.next_animation && this._total_transition_time > 0) {
            elapsed += elapsed * this._factor * this.current_animation.length / this.next_animation.length;

            this._transition_time += Math.abs(elapsed);
            this._factor = this._transition_time / this._total_transition_time;
            if (this._transition_time >= this._total_transition_time) {
                let progress = this.progress;
                this.play(this.next_animation.name);
                this.next_animation = null;
            }
        }

        this.time += elapsed;

        if (this.time < 0) {
            if (this.current_animation.looping) {
                this.time += this.length;
            }
            else {
                this.time = 0;
            }
            if (this.time !== initial_time) {
                this.animation_finished.dispatch(this.name);
            }
        }
        else if (this.time >= this.length) {
            if (this.current_animation.looping) {
                this.time -= this.length;
            }
            else {
                this.time = this.length;
            }
            if (this.time !== initial_time) {
                this.animation_finished.dispatch(this.name);
            }
        }

        this.animate(elapsed);
    }

    /**
     * Apply transform to sprites
     * @param {number} delta 
     */
    animate(delta) {
        let frame_data = this.data_provider.get_frame_data(this.time, delta, this._factor, this.current_animation, this.next_animation);

        /**
         * @type {number}
         */
        let i = 0;
        /**
         * @type {Obj}
         */
        let info;
        /**
         * @type {Sprite}
         */
        let sprite;
        for (i = 0; i < frame_data.sprite_data.length; i++) {
            info = frame_data.sprite_data[i];
            sprite = this.sprite_provider.get(info.folder, info.file);
            if (sprite) {
                this.apply_sprite_transform(sprite, info);
            }
        }
    }

    /**
     * @param {Sprite} sprite 
     * @param {Obj} info
     */
    apply_sprite_transform(sprite, info) {}
}
