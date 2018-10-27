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
        this.rect3 = this.add_child(new v.Graphics())

        this.hero = this.add_child(new Box())
        this.hero.position.set(180, 200)

        this.body = this.add_child(new v.RigidBody2D())
        this.body.add_shape(new v.RectangleShape2D(10, 10))
        this.body.set_collision_layer_bit(2, true)
        this.body.set_collision_mask_bit(1, true)
        this.body.bounce = 0.3
        this.body.position.set(230, 200);
        this.rect = this.add_child(new v.Graphics())
        this.body.add_child(new v.Graphics())
            .begin_fill(0xFFFF00, 0.6)
            .draw_rect(-10, -10, 20, 20)
            .end_fill()

        this.set_process(true)
    }
    _process(delta) {
        this.rect3.set_position(this.static_2.position)
            .clear()

            .set_line_style(1, 0xFFFFFF, 1, 0)
            .begin_fill(0xFFFF00, 0.6)
            .move_to(this.static_2.shapes[0].vertices[0].x, this.static_2.shapes[0].vertices[0].y)
            .line_to(this.static_2.shapes[0].vertices[1].x, this.static_2.shapes[0].vertices[1].y)
            .line_to(this.static_2.shapes[0].vertices[2].x, this.static_2.shapes[0].vertices[2].y)
            .line_to(this.static_2.shapes[0].vertices[3].x, this.static_2.shapes[0].vertices[3].y)
            .end_fill()

            .set_line_style(1, 0xFFFFFF, 1, 0)
            .move_to(0, 0)
            .line_to(this.static_2.shapes[0].normals[0].x * 20, this.static_2.shapes[0].normals[0].y * 20)
            .move_to(0, 0)
            .line_to(this.static_2.shapes[0].normals[1].x * 20, this.static_2.shapes[0].normals[1].y * 20)

        this.rect.set_position(this.body.position)
            .clear()

            .begin_fill(0x00FFFF, 0.6)
            .move_to(this.body.shapes[0].vertices[0].x, this.body.shapes[0].vertices[0].y)
            .line_to(this.body.shapes[0].vertices[1].x, this.body.shapes[0].vertices[1].y)
            .line_to(this.body.shapes[0].vertices[2].x, this.body.shapes[0].vertices[2].y)
            .line_to(this.body.shapes[0].vertices[3].x, this.body.shapes[0].vertices[3].y)
            .end_fill()

            .set_line_style(1, 0xFFFFFF, 1, 0)
            .move_to(0, 0)
            .line_to(this.body.linear_velocity.x, this.body.linear_velocity.y)
    }
}
