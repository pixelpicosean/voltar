import * as v from 'engine/index';
import { Vector2 } from 'engine/index';

export default class SAT extends v.Node2D {
    static instance() {
        return new SAT();
    }

    _enter_tree() {
        // this.area = this.add_child(new v.Area2D());
        // this.area.add_shape(new v.RectangleShape2D(10, 10));
        // this.area.x = 30;
        // this.area.y = 20;
        // // this.area.set_collision_mask_bit(1, true);
        // const rect = this.area.add_child(new v.Graphics());
        // rect.begin_fill(0x00FFFF, 0.6);
        // rect.draw_rect(-10, -10, 20, 20);
        // rect.end_fill();

        // this.area.area_entered.add(() => {
        //     rect.clear();
        //     rect.begin_fill(0xFF0000, 0.6);
        //     rect.draw_rect(-10, -10, 20, 20);
        //     rect.end_fill();
        // });
        // this.area.area_exited.add(() => {
        //     rect.clear();
        //     rect.begin_fill(0x00FFFF, 0.6);
        //     rect.draw_rect(-10, -10, 20, 20);
        //     rect.end_fill();
        // });

        // this.static_1 = this.add_child(new v.Area2D());
        // this.static_1.add_shape(new v.RectangleShape2D(10, 10));
        // this.static_1.set_collision_layer_bit(1, true);
        // this.static_1.position.set(55, 20);
        // this.static_1.rotation = Math.PI * 0.25;
        // const rect2 = this.static_1.add_child(new v.Graphics());
        // rect2.begin_fill(0xFFFFFF, 0.6);
        // rect2.draw_rect(-10, -10, 20, 20);
        // rect2.end_fill();

        this.static_2 = this.add_child(new v.StaticBody2D());
        this.static_2.add_shape(new v.RectangleShape2D(40, 10));
        this.static_2.set_collision_layer_bit(1, true);
        this.static_2.position.set(200, 300);
        // this.static_2.rotation = -Math.PI * 0.1;
        const rect3 = this.static_2.add_child(new v.Graphics());
        rect3.begin_fill(0xFFFF00, 0.6);
        rect3.draw_rect(-40, -10, 80, 20);
        rect3.end_fill();

        this.rigid = this.add_child(new v.RigidBody2D());
        this.rigid.add_shape(new v.RectangleShape2D(10, 10));
        this.rigid.set_collision_mask_bit(1, true);
        this.rigid.position.set(200, 100);
        this.rigid.rotation = Math.PI * 0.25;
        this.rigid.bounce = 0.5;
        const rect4 = this.rigid.add_child(new v.Graphics());
        rect4.begin_fill(0xFF00FF, 0.6);
        rect4.draw_rect(-10, -10, 20, 20);
        rect4.end_fill();

        this.set_process(true);

        v.input.bind('SPACE', 'go');
    }

    /**
     * @param {number} delta
     */
    _process(delta) {
        // this.area.x += 10 * delta;
        // this.area.rotation += Math.PI * 0.4 * delta;

        if (v.input.is_action_just_pressed('go')) {
            this.rigid.apply_impulse(new Vector2(), new Vector2(0, -50));
        }
    }
}
