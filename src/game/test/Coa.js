import * as v from 'engine/index';

v.preload('media/commander.json');
v.preload('cc', 'media/commander.scon');


export default class CoaTest extends v.Node2D {
    static instance() {
        return new CoaTest();
    }

    async _enter_tree() {
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
        await v.yield(v.scene_tree.create_timer(4), 'timeout');

        hero.animator.transition('walk', 0.5);
        await v.yield(v.scene_tree.create_timer(4), 'timeout');

        hero.animator.transition('jump', 0.5);
        await v.yield(v.scene_tree.create_timer(4), 'timeout');

        hero.animator.transition('doublejump', 0.5);
        await v.yield(v.scene_tree.create_timer(4), 'timeout');

        hero.animator.transition('fall', 0.5);
        await v.yield(v.scene_tree.create_timer(4), 'timeout');

        hero.animator.transition('wallslice', 0.5);
        await v.yield(v.scene_tree.create_timer(4), 'timeout');

        hero.animator.transition('atk', 0.5);
        await v.yield(v.scene_tree.create_timer(4), 'timeout');

        hero.animator.transition('idle', 0.5);
    }
    _ready() {
        this.set_process(true);
        this.last = performance.now();
    }
    _exit_tree() {}
}
