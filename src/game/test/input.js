import * as v from 'engine';


v.loader.add('tileset', 'media/tileset.png');
v.loader.add('icon', 'media/icon.png');


class Me extends v.PhysicsBody2D {
    constructor() {
        super();

        this.set_shape(new v.RectangleShape2D(8, 8));
        this.scale.set(2);

        this.gfx = new v.Sprite();
        this.gfx.texture = 'icon';
        this.gfx.scale.set(0.25);
        this.gfx.anchor.set(0.5);
        this.add_child(this.gfx);

        this.vec = new v.Vector();
    }
    _ready() {
        this.set_process(true);

        v.input.bind('A', 'left');
        v.input.bind('D', 'right');
        v.input.bind('W', 'up');
        v.input.bind('S', 'down');
    }
    _process(delta) {
        this.vec.set(0);
        if (v.input.state('left')) {
            this.vec.x -= 10;
        }
        if (v.input.state('right')) {
            this.vec.x += 10;
        }
        if (v.input.state('up')) {
            this.vec.y -= 10;
        }
        if (v.input.state('down')) {
            this.vec.y += 10;
        }
        this.move(this.vec.scale(delta));
    }
}


export default class InputScene extends v.Node2D {
    static instance() {
        return new InputScene();
    }

    _enter_tree() {
        const t = new v.BackgroundMap(16, 16, [
            [  0,  1,  2,  3,  4 ],
            [  5,  6,  7,  8,  9 ],
            [ 10, 11, 12, 13, 14 ],
            [ 15, 16, 17, 18, 19 ],
        ], 'tileset');
        t.scale.set(2);
        this.add_child(t);

        const c = new v.CollisionMap(32, [
            [  1,  1,  1,  1,  1 ],
            [  1,  0,  0,  0,  1 ],
            [  1,  0,  24,  0,  1 ],
            [  1,  1,  1,  1,  1 ],
        ]);
        this.add_child(c);

        this.s = new Me();
        this.s.position.set(64, 64);
        this.add_child(this.s);
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
