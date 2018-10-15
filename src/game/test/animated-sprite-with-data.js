import * as v from 'engine/index';

v.preload('hero/1', 'media/hero/1.png');
v.preload('hero/2', 'media/hero/2.png');
v.preload('hero/3', 'media/hero/3.png');

export default class AnimatedSpriteScene2 extends v.Node2D {
    static instance() {
        return new AnimatedSpriteScene2();
    }

    _enter_tree() {
        let spr = new v.AnimatedSprite('hero');
        spr.position.set(100, 100);
        spr.play('run');
        this.add_child(spr);
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
