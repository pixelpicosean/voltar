import { remove_item } from 'engine/dep/index';

import Tween from './tween';

export default class TweenManager {
    static create() {
        const t = pool_TweenManager.pop();
        if (!t) {
            return new TweenManager;
        } else {
            return t;
        }
    }
    static free(t: TweenManager) {
        if (t) {
            for (let tween of t.tweens) {
                Tween.free(tween);
            }
            t.tweens.length = 0;
            pool_TweenManager.push(t);
        }
        return TweenManager;
    }

    tweens: Tween[] = [];

    add(tween: Tween) {
        this.tweens.push(tween);
        return tween;
    }
    remove(tween: Tween) {
        tween.active = false;
        tween.is_removed = true;
    }
    /**
     * Create a tween instance
     * @param [add] Whether add to update list
     */
    create(add: boolean) {
        if (add === undefined) {
            add = false;
        }

        let t = new Tween;
        if (add) {
            this.tweens.push(t);
        }

        return t;
    }
    stop_all() {
        /** @type {Tween} */
        let tween: Tween = null;
        for (let i = 0; i < this.tweens.length; i++) {
            tween = this.tweens[i];

            tween.clear_events();
            tween.remove_all();
            tween = null;
        }
        this.tweens.length = 0;
    }

    _process(delta: number) {
        let tween: Tween = null;
        for (let i = 0; i < this.tweens.length; i++) {
            tween = this.tweens[i];

            if (!tween.is_removed && tween.active) {
                tween._propagate_process(delta);

                if (tween.is_removed) {
                    remove_item(this.tweens, i--);

                    tween.clear_events();
                    tween.remove_all();
                    tween = null;
                }
            }
        }
    }
}

const pool_TweenManager: TweenManager[] = [];
