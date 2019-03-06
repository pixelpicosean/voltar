import Tween from './tween';
import { remove_items } from 'engine/dep/index';

export default class TweenManager {
    constructor() {
        /**
         * @type {Array<Tween>}
         */
        this.tweens = [];
    }
    /**
     * @param {Tween} tween
     * @returns {Tween} The added tween
     */
    add(tween) {
        this.tweens.push(tween);
        return tween;
    }
    /**
     * @param {Tween} tween
     */
    remove(tween) {
        tween.active = false;
        tween.is_removed = true;
    }
    /**
     * Create a tween instance
     *
     * @param {boolean} [add] Whether add to update list
     * @returns {Tween} Created tween
     */
    create(add) {
        if (add === undefined) {
            add = false;
        }

        let t = new Tween();
        if (add) {
            this.tweens.push(t);
        }

        return t;
    }

    /**
     * @param {number} delta
     */
    _process(delta) {
        /**
         * @type {Tween}
         */
        let tween;
        for (let i = 0; i < this.tweens.length; i++) {
            tween = this.tweens[i];

            if (!tween.is_removed && tween.active) {
                tween._propagate_process(delta);

                if (tween.is_removed) {
                    remove_items(this.tweens, i--, 1);

                    tween.clear_events();
                    tween.remove_all();
                    tween = null;
                }
            }
        }
    }
    _stop_all() {
        /**
         * @type {Tween}
         */
        let tween;
        for (let i = 0; i < this.tweens.length; i++) {
            tween = this.tweens[i];

            tween.clear_events();
            tween.remove_all();
            tween = null;
        }
        this.tweens.length = 0;
    }
}
