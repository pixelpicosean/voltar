import * as v from 'engine/index';

v.preload('media/04b03.fnt');

v.preload('media/commander.json');
v.preload('cc', 'media/commander.scon');


export default class CoaTest extends v.Node2D {
    static instance() {
        return new CoaTest();
    }

    _enter_tree() {
        const num = 32, col = 8;
        const scale = 0.25;
        // for (let i = 0; i < num; i++) {
        //     let hero = this.add_child(new CoaSprite().load('cc', 0));
        //     hero.scale.set(scale, -scale);
        //     hero.position.set(20 + 30 * Math.floor(i % col), 40 + 40 * Math.floor(i / col));
        //     hero.play('idle');
        // }

        let hero = this.add_child(new v.CutoutAnimation().load('cc', 0));
        hero.position.set(128, 200);
        hero.play('idle');
        // hero.animator.speed = 0.25;
        setInterval(() => {
            switch (hero.animator.current_animation.name) {
                case 'idle':
                    hero.animator.transition('walk', 0.5);
                    break;
                case 'walk':
                    hero.animator.transition('jump', 0.5);
                    break;
                case 'jump':
                    hero.animator.transition('doublejump', 0.5);
                    break;
                case 'doublejump':
                    hero.animator.transition('fall', 0.5);
                    break;
                case 'fall':
                    hero.animator.transition('wallslice', 0.5);
                    break;
                case 'wallslice':
                    hero.animator.transition('atk', 0.5);
                    break;
                case 'atk':
                    hero.animator.transition('idle', 0.5);
                    break;
            }
        }, 4000);

        // this.info = this.add_child(new v.BitmapText('0', {
        //     font: '04b03',
        // }));
        // this.info.position.set(4, 4);
    }
    _ready() {
        this.set_process(true);
        this.last = performance.now();
    }
    _render(now) {
        // this.info.text = `${(1000 / (now - this.last)) | 0}`;
        // this.last = now;
    }
    _exit_tree() {}
}
