import * as v from 'engine';
import { Model } from 'engine/core/scene/sprites/coa/Model';
import CoaSprite from 'engine/core/scene/sprites/coa/CoaSprite';

v.loader.add('media/commander.json');
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
        
        this.hero = this.add_child(new CoaSprite().load(model, model.entity[0]));
        this.hero.position.set(100, 150);
        this.hero.play('idle');

        this.set_process(true);
    }
    _process(delta) {}
    _exit_tree() {}
}
