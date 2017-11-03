import * as v from 'engine';
import { Model } from 'engine/core/scene/coa_sprite/Model';
import CoaSprite from 'engine/core/scene/coa_sprite/CoaSprite';

v.loader.add('media/commander.json');
v.loader.add('cc', 'media/commander/commander.scon');


export default class CoaTest extends v.Node2D {
    static instance() {
        return new CoaTest();
    }

    _enter_tree() {
        const num = 32, col = 8;
        const scale = 0.25;
        for (let i = 0; i < num; i++) {
            let hero = this.add_child(new CoaSprite().load('cc', 0));
            hero.scale.set(scale, -scale);
            hero.position.set(20 + 30 * Math.floor(i % col), 40 + 40 * Math.floor(i / col));
            hero.play('idle');
        }

        this.info = this.add_child(new v.BitmapText('0', {
            font: '04b03',
        }));
        this.info.position.set(4, 4);
    }
    _ready() {
        this.set_process(true);
        this.last = performance.now();
    }
    _render(now) {
        this.info.text = `${(1000 / (now - this.last)) | 0}`;
        this.last = now;
    }
    _exit_tree() {}
}
