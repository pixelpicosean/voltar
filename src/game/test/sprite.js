import * as v from 'engine/index';

v.preload('icon', 'media/icon.png');

export default class SpriteTest extends v.Node2D {
    static instance() {
        return new SpriteTest();
    }

    _enter_tree() {
        let spr = this.add_child(new v.Sprite('icon'));
        spr.position.set(100, 100);
    }
    _ready() { }
    _process(delta) { }
    _exit_tree() { }
}
