import * as v from 'engine/index';

export default class SAT extends v.Node2D {
    static instance() {
        return new SAT();
    }

    _enter_tree() {
        this.area = this.add_child(new v.Area2D());
        this.area.add_shape(new v.RectangleShape2D(10, 10));
        this.area.x = 30;
        this.area.y = 20;
        this.area.set_collision_mask_bit(1, true);
        const rect = this.area.add_child(new v.Graphics());
        rect.begin_fill(0xFFFFFF, 0.6);
        rect.draw_rect(-10, -10, 20, 20);
        rect.end_fill();

        this.area.area_entered.add(() => {
            rect.clear();
            rect.begin_fill(0xFF0000, 0.6);
            rect.draw_rect(-10, -10, 20, 20);
            rect.end_fill();
        });
        this.area.area_exited.add(() => {
            rect.clear();
            rect.begin_fill(0xFFFFFF, 0.6);
            rect.draw_rect(-10, -10, 20, 20);
            rect.end_fill();
        });

        this.static_one = this.add_child(new v.Area2D());
        this.static_one.add_shape(new v.RectangleShape2D(10, 10));
        this.static_one.x = 55;
        this.static_one.y = 20;
        this.static_one.rotation = Math.PI * 0.25;
        this.static_one.set_collision_layer_bit(1, true);
        const rect2 = this.static_one.add_child(new v.Graphics());
        rect2.begin_fill(0x00FFFF, 0.6);
        rect2.draw_rect(-10, -10, 20, 20);
        rect2.end_fill();

        this.set_process(true);
    }

    /**
     * @param {number} delta
     */
    _process(delta) {
        // this.area.x += 10 * delta;
        this.area.rotation += Math.PI * 0.4 * delta;
    }
}
