import * as v from 'engine/index';


class CustomArea extends v.Area2D {
    constructor(ext_x, ext_y) {
        super();

        this.set_shape(new v.RectangleShape2D(ext_x, ext_y));
        this.set_collision_layer_bit(1, true);
        this.set_collision_mask_bit(2, true);

        this._debug_shape = new v.Graphics();
        this._debug_shape.clear();
        this._debug_shape.begin_fill(0xffffff);
        this._debug_shape.draw_rect(-this._shape.extents.x, -this._shape.extents.y, this._shape.extents.x * 2, this._shape.extents.y * 2);
        this._debug_shape.end_fill();
        this.add_child(this._debug_shape);

        this.body_entered.add((who) => {
            console.log(`Body "${who.name}" enter`);
            this._debug_shape.tint = 0xFFCCAA;
        });
        this.body_exited.add((who) => {
            console.log(`Body "${who.name}" exit`);
            this._debug_shape.tint = 0xFFFFFF;
        });

        this.area_entered.add((who) => {
            console.log(`${who.name} enter`);
            this._debug_shape.tint = 0x00E756;
        });
        this.area_exited.add((who) => {
            console.log(`${who.name} exit`);
            this._debug_shape.tint = 0xFFFFFF;
        });
    }
}

class CustomArea2 extends v.Area2D {
    constructor() {
        super();

        this.set_shape(new v.RectangleShape2D(16, 16));
        this.set_collision_layer_bit(2, true);

        this._debug_shape = new v.Graphics();
        this._debug_shape.clear();
        this._debug_shape.begin_fill(0xffffff);
        this._debug_shape.draw_rect(-this._shape.extents.x, -this._shape.extents.y, this._shape.extents.x * 2, this._shape.extents.y * 2);
        this._debug_shape.end_fill();
        this.add_child(this._debug_shape);
    }
}


class StaticBody extends v.PhysicsBody2D {
    constructor() {
        super();

        this.set_shape(new v.RectangleShape2D(40, 20));
        this.set_collision_layer_bit(2, true);

        this._debug_shape = new v.Graphics();
        this._debug_shape.clear();
        this._debug_shape.begin_fill(0xffffff);
        this._debug_shape.draw_rect(-this._shape.extents.x, -this._shape.extents.y, this._shape.extents.x * 2, this._shape.extents.y * 2);
        this._debug_shape.end_fill();
        this.add_child(this._debug_shape);
    }
    _collide_body(body, res) {
        return false;
    }
}


class CustomBody extends v.PhysicsBody2D {
    constructor() {
        super();

        this.velocity = new v.Vector2(0, 0);

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

    _collide_body(body, res) {
        // this.velocity.slide(res.overlap_n);
        this.velocity.bounce(res.overlap_n);

        this.add_collision_exception_with(body);

        return true;
    }
}


export default class PhysicsScene extends v.Node2D {
    static instance() {
        return new PhysicsScene();
    }

    _enter_tree() {
        const e = new CustomArea(5, 30);
        e.name = 'e';
        e.position.set(60, 200);
        this.add_child(e);
        this.e = e;

        const d = new CustomArea2();
        d.name = 'd';
        d.position.set(100, 200);
        this.add_child(d);
        this.d = d;

        const b = new StaticBody();
        b.name = 'b';
        b.position.set(128, 128);
        this.add_child(b);
        this.b = b;

        const c = new CustomBody();
        c.name = 'c';
        c.position.set(128, 10);
        this.add_child(c);
        this.c = c;

        const a = new CustomArea(16, 16);
        a.name = 'a';
        a.rotation = Math.PI * 0.25;
        a.position.set(10, 128);
        this.add_child(a);
        this.a = a;
    }
    _ready() {
        this.set_process(true);
    }
    _process(delta) {
        this.e.rotation += 0.5 * delta;
        this.a.x += 20 * delta;
    }
    _exit_tree() {}
}
