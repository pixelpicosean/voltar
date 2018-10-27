import * as v from 'engine/index';

v.preload('tileset', 'media/tileset.png');

const speed = 80;

class Me extends v.Sprite {
    constructor() {
        super('hero/1');

        this.anchor.set(0.5, 0.8);
        this.scale.set(1.5);
    }
    _ready() {
        this.set_process(true);

        v.input.bind('A', 'left');
        v.input.bind('D', 'right');
        v.input.bind('W', 'up');
        v.input.bind('S', 'down');
    }
    _process(delta) {
        const x = (v.input.is_action_pressed('left') ? -1 : 0) + (v.input.is_action_pressed('right') ? 1 : 0);
        const y = (v.input.is_action_pressed('up') ? -1 : 0) + (v.input.is_action_pressed('down') ? 1 : 0);
        this.x += speed * x * delta;
        this.y += speed * y * delta;

        // Facing the movement direction
        if (x < 0) {
            this.scale.x = -Math.abs(this.scale.x);
        } else if (x > 0) {
            this.scale.x = Math.abs(this.scale.x);
        }
    }
}


export default class InputScene extends v.Node2D {
    static instance() {
        return new InputScene();
    }

    _enter_tree() {
        const t = new v.BackgroundMap(16, 16, [
            [  1,  2,  3,  4,  5 ],
            [  6,  7,  8,  9, 10 ],
            [ 11, 12, 13, 14, 15 ],
            [ 16, 17, 18, 19, 20 ],
        ], 'tileset');
        t.scale.set(4);
        this.add_child(t);

        const s = this.add_child(new Me())
            .set_position(100, 100)
        s.interactive = true
        s.on('pointerdown', () => {
            console.log('jump')
            s.tweens.create(true)
                .interpolate_property(s.scale, 'y', 1.5, 1.75, 0.1, 'Quartic.Out')
                .interpolate_property(s.scale, 'y', 1.75, 1.5, 0.1, 'Quartic.In', 0.1)
                .start()
        })
    }
}
