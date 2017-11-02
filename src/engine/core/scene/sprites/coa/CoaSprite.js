import Node2D from '../../Node2D';
import Animator from './Animator';
import { Entity, Model } from './Model';


export default class CoaSprite extends Node2D {
    constructor() {
        super();

        /**
         * @type {Animator}
         */
        this.animator = null;

        this.scale.y = -1;
    }
    /**
     * Load entity data from scon model
     * @param {Model} model
     * @param {Entity} entity
     */
    load(model, entity) {
        this.animator = new Animator(entity, this);
        this.animator.sprite_provider.load(model.folder);
        return this;
    }

    play(anim) {
        if (!this.animator) {
            return false;
        }

        this.animator.play(anim);
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
