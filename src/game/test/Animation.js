import * as v from 'engine/index';

export default class AnimationTest extends v.Node2D {
    static instance() {
        return new AnimationTest();
    }

    _enter_tree() {
        this.label = this.add_child(new v.BitmapText('', {
            font: '32px 04b03',
        }));
        this.label.x = 100;
    }
    _ready() {
        let icon = this.add_child(new v.Sprite('icon'));
        icon.position.set(50, 100);

        let icon2 = this.add_child(new v.Sprite('icon'));
        icon2.scale.set(0.5);
        icon2.position.set(0, 180);

        let tween = this.tweens.create(false);
        tween.interpolate_property(icon, 'position', { x: 50, y: 100 }, { x: 150, y: 50 }, 1, 'Quadratic.InOut', 2);
        // @ts-ignore
        tween.interpolate_property(icon, 'position.x', 150, 50, 1, 'Quadratic.InOut', 3);
        tween.interpolate_property(icon, 'tint', 0x000000, 0xFFFFFF, 2, 'Quadratic.InOut', 2);
        tween.connect('tween_completed', (key) => {
            console.log(`animation [${key}] end`);
        });
        tween.interpolate_method(this, 'fly', 0, 100, 5, 'Quadratic.InOut');
        tween.interpolate_deferred_callback(this, 3, 'deferred_greet', 'Sean');
        tween.interpolate_callback(this, 3, 'greet', 'Sean');
        tween.follow_property(icon2, 'x', 0, icon, 'x', 1, 'Linear.None', 1);
        tween.follow_method(icon2, 'set_position', { x: 50, y: icon2.y }, icon, 'get_position', 2, 'Linear.None', 2);
        // tween.targeting_property(icon2, 'x', icon, 'x', 0, 1, 'Linear.None', 0);
        tween.targeting_method(icon2, 'set_position', icon, 'get_position', { x: 0, y: 0 }, 1, 'Linear.None', 0);
        tween.start();

        icon.tweens.add(tween);

        let tile = this.add_child(new v.TilingSprite('icon', 64, 64));
        tile.width = 400;
        tile.height = 400;
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
        this.label.text = `fly: ${num | 0}`;
    }
}
