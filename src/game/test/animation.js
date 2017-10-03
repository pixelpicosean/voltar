import * as v from 'engine';


export default class AnimationTest extends v.Node2D {
    static instance() {
        return new AnimationTest();
    }

    _enter_tree() {}
    _ready() {
        let icon = this.add_child(new v.Sprite('icon'));
        icon.position.set(50, 100);

        let tween = new v.Tween();
        tween.interpolate_property(icon, 'position.x', 50, 150, 1, 'Quadratic.InOut', 2);
        tween.interpolate_property(icon, 'position.x', 150, 50, 1, 'Quadratic.InOut', 3);
        tween.interpolate_property(icon, 'tint', 0x000000, 0xFFFFFF, 2, 'Quadratic.InOut', 2);
        tween.tween_completed.add(() => {
            console.log('animation end');
        });
        tween.interpolate_method(this, 'fly', 0, 100, 5, 'Quadratic.InOut');
        tween.interpolate_deferred_callback(this, 3, 'deferred_greet', 'Sean');
        tween.interpolate_callback(this, 3, 'greet', 'Sean');
        tween.start();

        icon.tweens.add(tween);
    }
    _process(delta) {}
    _exit_tree() {}

    greet(name) {
        console.log(`hello, ${name}`);
    }
    deferred_greet(name) {
        console.log(`[deferred] hello, ${name}`);
    }

    fly(num) {
        // console.log(`fly: ${num | 0}`);
    }
}
