import * as v from 'engine/index';

export default class AnimatedSpriteScene2 extends v.Node2D {
    static instance() {
        return new AnimatedSpriteScene2();
    }

    _enter_tree() {
        // This animation is defind in `assets/spriteframe/default.json`
        let spr = new v.AnimatedSprite('hero');
        spr.position.set(100, 100);
        spr.play('run');
        this.add_child(spr);
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
