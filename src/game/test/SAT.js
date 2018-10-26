import * as v from 'engine/index';
import { Vector2 } from 'engine/index';

class Box extends v.KinematicBody2D {
    constructor() {
        super();

        this.add_shape(new v.RectangleShape2D(10, 10));
        this.set_collision_mask_bit(1, true);

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
        this.motion.set(0, 20);
        const info = this.move_and_collide(this.motion);
        if (info) {
            // console.log('landed')
        }
    }
}

export default class SAT extends v.Node2D {
    static instance() {
        return new SAT();
    }

    _enter_tree() {
        this.static_2 = this.add_child(new v.StaticBody2D());
        this.static_2.add_shape(new v.RectangleShape2D(40, 10));
        this.static_2.set_collision_layer_bit(1, true);
        this.static_2.position.set(200, 300);
        this.static_2.rotation = -Math.PI * 0.1;
        const rect3 = this.static_2.add_child(new v.Graphics());
        rect3.begin_fill(0xFFFF00, 0.6);
        rect3.draw_rect(-40, -10, 80, 20);
        rect3.end_fill();

        this.hero = this.add_child(new Box());
        this.hero.position.set(200, 100);
    }
}
