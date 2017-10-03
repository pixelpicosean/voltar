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
        tween.interpolate_property(icon, 'visible', true, false, 0.2, 'Quadratic.InOut', 0);
        tween.interpolate_property(icon, 'visible', false, true, 0.2, 'Quadratic.InOut', 0.2);
        tween.tween_step.add((key, elapsed, result) => {
            console.log(`${key}: [${elapsed}] - [${result}]`);
        });
        tween.tween_completed.add(() => {
            console.log('animation end');
        });
        tween.start();
    }
    _process(delta) {}
    _exit_tree() {}
}
