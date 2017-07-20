import * as v from 'engine';
import settings from './settings';


class RectangleShape2D {
    constructor(extent_x = 4, extent_y = 4) {
        this.extents = new v.Vector(extent_x, extent_y);
    }
}


class CollisionObject2D extends v.Node2D {
    get_shape() {
        return this._shape;
    }
    set_shape(s) {
        this._shape = s;

        this._debug_shape.clear();
        this._debug_shape.begin_fill(0xffffff);
        this._debug_shape.draw_rect(-s.extents.x, -s.extents.y, s.extents.x * 2, s.extents.y * 2);
        this._debug_shape.end_fill();
    }

    get_collision_layer() {
        return this.collision_layer;
    }
    get_collision_layer_bit(bit) {
        return this.collision_layer & (1 << bit);
    }
    set_collision_layer(layer) {
        thsi.collision_layer = layer;
    }
    set_collision_layer_bit(bit, value) {
        if (value) {
            this.collision_layer |= 1 << bit;
        }
        else {
            this.collision_layer &= ~(1 << bit);
        }
    }

    get_collision_mask() {
        return this.collision_mask;
    }
    get_collision_mask_bit(bit) {
        return this.collision_mask & (1 << bit);
    }
    set_collision_mask(mask) {
        this.collision_mask = mask;
    }
    set_collision_mask_bit(bit, value) {
        if (value) {
            this.collision_mask |= 1 << bit;
        }
        else {
            this.collision_mask &= ~(1 << bit);
        }
    }

    constructor() {
        super();

        this.collision_layer = 0;
        this.collision_mask = 0;

        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;

        this._shape = null;
        this._debug_shape = new v.Graphics();
        this.add_child(this._debug_shape);
    }

    _enter_tree() {}
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}


class Area2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'Area2D';

        this.area_map = {};
        this.body_map = {};

        this.area_entered = new v.Signal();
        this.area_exited = new v.Signal();
        this.body_entered = new v.Signal();
        this.body_exited = new v.Signal();
    }
    area_enter(area) {}
    area_exit(area) {}
    body_enter(body) {}
    body_exit(body) {}
}


class PhysicsBody2D extends CollisionObject2D {
    constructor() {
        super();

        this.type = 'PhysicsBody2D';

        this.collision_exceptions = [];
    }
    _collide(body, res) {
        return true;
    }

    add_collision_exception_with(body) {
        if (this.collision_exceptions.indexOf(body) < 0) {
            this.collision_exceptions.push(body);
        }
    }
}

class CustomBody extends PhysicsBody2D {
    constructor() {
        super();

        this.velocity = new v.Vector(0, 40);
    }
    _enter_tree() {
        this.set_shape(new RectangleShape2D(10, 10));
        this.set_collision_layer_bit(3, true);
        this.set_collision_mask_bit(2, true);
    }
    _ready() {
        this.set_process(true);
    }
    _process(delta) {
        // this.velocity.y += 40 * delta;

        this.x += this.velocity.x * delta;
        this.y += this.velocity.y * delta;
    }

    _collide(body, res) {
        console.log(`before: (${this.velocity.y.toFixed(2)}) - (y: ${this.bottom.toFixed(2)}) - (${body.top})`);
        this.velocity.bounce(res.overlap_n);
        console.log(`after: (${this.velocity.y.toFixed(2)}) - (y: ${(this.bottom - res.overlap).toFixed(2)}) - (${body.top})`);
        return true;
    }
}


class Scene extends v.Node2D {
    static instance() {
        return new Scene();
    }

    _enter_tree() {
        this.info = new v.Text('', {
            fill: 'white',
        });
        this.add_child(this.info);

        const a = new Area2D();
        a.name = 'a';
        a.position.set(100, 200);
        a.set_shape(new RectangleShape2D(16, 16));
        a.set_collision_layer_bit(1, true);
        a.set_collision_mask_bit(2, true);
        a.body_entered.add((who) => console.log(`${who.name} enter`));
        a.body_exited.add((who) => console.log(`${who.name} exit`));
        this.add_child(a);
        this.a = a;

        const b = new PhysicsBody2D();
        b.name = 'b';
        b.position.set(300, 200);
        b.set_shape(new RectangleShape2D(40, 20));
        b.set_collision_layer_bit(2, true);
        b.collide = () => false;
        this.add_child(b);
        this.b = b;

        const c = new CustomBody();
        c.name = 'c';
        c.position.set(300, 100);
        this.add_child(c);
        this.c = c;
        window.c = c;
    }
    _ready() {
        this.set_process(true);
    }
    _process(delta) {
        let p = this.a.get_global_position();
        this.info.text = `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})-`;
        p = this.b.get_global_position();
        this.info.text += `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;

        this.a.x += 20 * delta;
    }
    _exit_tree() {}
}

settings.application.main_scene = Scene;
v.scene_tree.init(settings);
