import * as v from 'engine';


class CustomArea extends v.Area2D {
    constructor() {
        super();

        this._debug_shape = null;
    }
    _enter_tree() {
        this.set_shape(new v.RectangleShape2D(16, 16));
        this.set_collision_layer_bit(1, true);
        this.set_collision_mask_bit(2, true);

        this._debug_shape = new v.Graphics();
        this._debug_shape.clear();
        this._debug_shape.begin_fill(0xffffff);
        this._debug_shape.draw_rect(-this._shape.extents.x, -this._shape.extents.y, this._shape.extents.x * 2, this._shape.extents.y * 2);
        this._debug_shape.end_fill();
        this.add_child(this._debug_shape);

        this.body_entered.add((who) => console.log(`${who.name} enter`));
        this.body_exited.add((who) => console.log(`${who.name} exit`));
    }
}


class StaticBody extends v.PhysicsBody2D {
    constructor() {
        super();

        this._debug_shape = null;
    }
    _enter_tree() {
        this.set_shape(new v.RectangleShape2D(40, 20));
        this.set_collision_layer_bit(2, true);

        this._debug_shape = new v.Graphics();
        this._debug_shape.clear();
        this._debug_shape.begin_fill(0xffffff);
        this._debug_shape.draw_rect(-this._shape.extents.x, -this._shape.extents.y, this._shape.extents.x * 2, this._shape.extents.y * 2);
        this._debug_shape.end_fill();
        this.add_child(this._debug_shape);
    }
    collide(body, res) {
        return false;
    }
}


class CustomBody extends v.PhysicsBody2D {
    constructor() {
        super();

        this._debug_shape = null;
        this.velocity = new v.Vector(0, 0);
    }
    _enter_tree() {
        this.set_shape(new v.RectangleShape2D(10, 10));
        this.set_collision_layer_bit(3, true);
        this.set_collision_mask_bit(2, true);

        this._debug_shape = new v.Graphics();
        this._debug_shape.clear();
        this._debug_shape.begin_fill(0xffffff);
        this._debug_shape.draw_rect(-this._shape.extents.x, -this._shape.extents.y, this._shape.extents.x * 2, this._shape.extents.y * 2);
        this._debug_shape.end_fill();
        this.add_child(this._debug_shape);
    }
    _ready() {
        this.set_process(true);
    }
    _process(delta) {
        this.velocity.y += 40 * delta;

        this.x += this.velocity.x * delta;
        this.y += this.velocity.y * delta;
    }

    _collide(body, res) {
        // this.velocity.slide(res.overlap_n);
        this.velocity.bounce(res.overlap_n);

        this.add_collision_exception_with(body);

        return true;
    }
}


export default class TestScene extends v.Node2D {
    static instance() {
        return new TestScene();
    }

    _enter_tree() {
        this.info = new v.Text('', {
            fill: 'white',
        });
        this.add_child(this.info);

        const a = new CustomArea();
        a.name = 'a';
        a.position.set(100, 200);
        this.add_child(a);
        this.a = a;

        const b = new StaticBody();
        b.name = 'b';
        b.position.set(300, 200);
        this.add_child(b);
        this.b = b;

        const c = new CustomBody();
        c.name = 'c';
        c.position.set(300, 100);
        this.add_child(c);
        this.c = c;

        this.timer = 0;
    }
    _ready() {
        this.set_process(true);
    }
    _process(delta) {
        this.a.x += 20 * delta;

        this.timer += delta;
        if (this.timer > 2) {
            v.scene_tree.change_scene_to('loading/scene');
        }
    }
    _exit_tree() {}
}
