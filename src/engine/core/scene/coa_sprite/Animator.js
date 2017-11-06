import Signal from 'mini-signals';
import Sprite from '../sprites/Sprite';
import Node2D from '../Node2D';

import { Entity, Animation, Obj } from './Model';
import { FrameData, frame_data_calculator } from './FrameData';
import { TextureProvider, object_provider } from './Provider';

export default class Animator {
    /**
     * @param {Entity} entity
     * @param {Node2D} node
     */
    constructor(entity, node) {
        this.animation_finished = new Signal();

        /**
         * @type {Entity}
         */
        this.entity = entity;

        /**
         * @type {Node2D}
         */
        this.node = node;

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
     * @returns {number}
     */
    get_progress() {
        return this.time / this.length;
    }
    /**
     * @param {number} value
     */
    set_progress(value) {
        this.time = value * this.length;
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
        this.set_progress(0);

        this.current_animation = this.animations[name];
        this.name = name;

        this.next_animation = null;
        this.length = this.current_animation.length;
    }

    /**
     * Transition to give animation doing a progressive blend
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
     * Blend two animations with the given weight factor.
     * Factor ranges from 0.0f - 1.0f
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
                // let progress = this.get_progress();
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
        /**
         * @type {FrameData}
         */
        let frame = null;
        if (!this.next_animation) {
            frame = frame_data_calculator.get_frame_data(this.current_animation, this.time, delta);
        }
        else {
            frame = frame_data_calculator.get_frame_data_with_blend(this.current_animation, this.next_animation, this.time, delta, this._factor);
        }

        /**
         * @type {Array<Obj>}
         */
        let objs = frame.sprite_data;

        if (this.node.children.length < objs.length) {
            let len = objs.length - this.node.children.length;
            for (let i = 0; i < len; i++) {
                this.node.add_child(object_provider.get_sprite());
            }
        }
        else if (this.node.children.length > objs.length) {
            let removes = this.node.remove_children(objs.length - 1);
            for (let spr of removes) {
                object_provider.put_sprite(spr);
            }
        }

        /**
         * @type {Obj}
         */
        let obj;
        /**
         * @type {Sprite}
         */
        let spr;
        let info;
        for (let i = 0; i < objs.length; i++) {
            obj = objs[i];
            info = this.sprite_provider.get(obj.folder, obj.file);

            spr = this.node.children[i];
            spr.texture = info.texture;
            spr.x = obj.x;
            spr.y = obj.y;
            spr.anchor.x = obj.pivot_x + info.pivot_x;
            spr.anchor.y = (1 - obj.pivot_y) + (1 - info.pivot_y);
            spr.rotation = obj.angle;
            spr.scale.set(obj.scale_x, -obj.scale_y);
            spr.alpha = obj.a;
        }

        // TODO: recycle `objs`
    }
}
