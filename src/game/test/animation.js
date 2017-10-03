import * as v from 'engine';


export default class AnimationTest extends v.Node2D {
    static instance() {
        return new AnimationTest();
    }

    _enter_tree() {}
    _ready() {
        let icon = this.add_child(new v.Sprite('icon'));
        icon.position.set(50, 100);

        let tween = icon.tweens.create();
        tween.interpolate_property(icon, 'position.x', 50, 150, 1, 'Quadratic.InOut', 2);
        tween.interpolate_property(icon, 'position.x', 150, 50, 1, 'Quadratic.InOut', 3);
        tween.interpolate_property(icon, 'tint', 0x000000, 0xFFFFFF, 2, 'Quadratic.InOut', 2);
        tween.tween_completed.add(() => {
            console.log('animation end');
        });
        tween.interpolate_callback({
            greet(name) {
                console.log(`hello, ${name}`);
            }
        }, 3, 'greet', 'Sean');
        tween.start();
    }
    _process(delta) {}
    _exit_tree() {}
}
