import Tween from './Tween';


export default class TweenManager {
    constructor() {
        this.tweens = [];
    }
    add(tween) {
        this.tweens.push(tween);
    }
    remove(tween) {
        tween.active = false;
        tween.is_removed = true;
    }

    _process(delta) {
        let i = 0, tween;
        for (i = 0; i < this.tweens.length; i++) {
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
        let i = 0, tween;
        for (i = 0; i < this.tweens.length; i++) {
            tween = this.tweens[i];

            tween.clear_events();
            tween.remove_all();
            tween = null;
        }
        this.tweens.length = 0;
    }
}
