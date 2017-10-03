import Tween from './Tween';


// Object recycle
const pool = [];
for (let i = 0; i < 20; i++) {
    pool.push(new Tween(null));
}

export default class TweenManager {
    constructor() {
        this.tweens = [];
    }
    create() {
        let tween = pool.pop();
        if (!tween) tween = new Tween();

        this.tweens.push(tween);

        return tween._init();
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
                    pool.push(tween);
                    remove_items(this.tweens, i--, 1);
                }
            }
        }
    }
    _stop_all() {
        let i = 0, tween;
        for (let i = 0; i < this.tweens.length; i++) {
            tween = this.tweens[i];
            tween.clear_events();
            pool.push(tween);
        }
        pool.length = 0;
    }
}
