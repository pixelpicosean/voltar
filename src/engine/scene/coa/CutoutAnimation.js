import Node2D from '../Node2D';
import Animator from './Animator';
import { Model } from './Model';

export default class CutoutAnimation extends Node2D {
    constructor() {
        super();

        /**
         * @type {Animator}
         */
        this.animator = null;
    }
    /**
     * Load entity data from scon model
     * @param {string} data key of the animation data
     * @param {number} entity entity index in the animation data
     * @returns {this}
     */
    load(data, entity) {
        /**
         * @type {Model}
         */
        let model = Data[data];
        this.animator = new Animator(model.entity[entity], this);
        this.animator.sprite_provider.load(model.folder);
        return this;
    }

    /**
     * Play animation
     * @param {string} anim
     * @returns {boolean}
     */
    play(anim) {
        if (!this.animator) {
            return false;
        }
        this.animator.play(anim);
        return true;
    }
    /**
     * Transition to give animation doing a progressive blend
     * @param {string} name
     * @param {number} total_transition_time
     * @returns {boolean}
     */
    transition(name, total_transition_time) {
        if (!this.animator) {
            return false;
        }
        this.animator.transition(name, total_transition_time);
        return true;
    }
    /**
     * Blend two animations with the given weight factor.
     * Factor ranges from 0.0f - 1.0f
     * @param {string} first
     * @param {string} second
     * @param {number} factor
     * @returns {boolean}
     */
    blend(first, second, factor) {
        if (!this.animator) {
            return false;
        }
        this.animator.blend(first, second, factor);
        return true;
    }

    /**
     * Updates the object transform for rendering.
     *
     * @private
     * @param {number} delta - Time since last tick.
     */
    _propagate_process(delta) {
        if (this.animator) {
            this.animator.update(delta * 1000);
        }

        super._propagate_process(delta);
    }
}

export const Data = {};
