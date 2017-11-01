import * as v from 'engine';
import { Model } from 'engine/core/scene/sprites/coa/Model';
import Animator from 'engine/core/scene/sprites/coa/Animator';

v.loader.add('cc', 'media/commander/commander.scon');


export default class CoaTest extends v.Node2D {
    static instance() {
        return new CoaTest();
    }

    _enter_tree() {
        this.info = this.add_child(new v.BitmapText('0', {
            font: '04b03',
        }));
        this.info.position.set(4, 4);
    }
    _ready() {
        let data = JSON.parse(v.loader.resources.cc.data);
        let model = new Model().load(data);
        this.animator = new Animator(model.entity[0]);
        this.animator.play('idle');
        // console.log(model);

        this.set_process(true);
    }
    _process(delta) {
        this.animator.update(delta * 1000);
        this.info.text = `${this.animator.progress.toFixed(2)}`;
    }
    _exit_tree() {}
}
