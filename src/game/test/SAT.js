import * as v from 'engine/index';
import { Vector2 } from 'engine/index';

const FloorNormal = new Vector2(0, -1);
const tmp_vec = new Vector2();

class Box extends v.KinematicBody2D {
    constructor() {
        super();

        this.add_shape(new v.RectangleShape2D(10, 10))
            .set_collision_mask_bit(1, true)
            .set_collision_mask_bit(2, true)

        this.add_child(new v.Graphics())
            .begin_fill(0x00FFFF, 0.6)
            .draw_rect(-10, -10, 20, 20)
            .end_fill()

        this.motion = new v.Vector2();

        this.physics_process = true;
    }
    /**
     * @param {number} delta
     */
    _physics_process(delta) {
        this.move_and_slide(this.motion.set(0, 20))
    }
}

export default class SAT extends v.Node2D {
    static instance() {
        return new SAT();
    }

    _enter_tree() {
        this.static_2 = this.add_child(new v.StaticBody2D())
            .add_shape(new v.RectangleShape2D(40, 10))
            .set_collision_layer_bit(1, true)
            .set_position(200, 300)
            .set_rotation(Math.PI * 0.1)
        this.static_2.add_child(new v.Graphics())
            .begin_fill(0xFFFF00, 0.6)
            .draw_rect(-40, -10, 80, 20)
            .end_fill()

        this.hero = this.add_child(new Box())
        this.hero.position.set(180, 200)

        this.body = this.add_child(new v.RigidBody2D())
            .add_shape(new v.RectangleShape2D(10, 10))
            .set_collision_layer_bit(2, true)
            .set_collision_mask_bit(1, true)
            .set_bounce(0.3)
            .set_position(230, 200)
            .add_child(new v.Graphics())
                .begin_fill(0xFFFF00, 0.6)
                .draw_rect(-10, -10, 20, 20)
                .end_fill()

        this.set_process(true)
    }
    _process(delta) {}
}
