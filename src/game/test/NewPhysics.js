import * as v from 'engine/index';

const PhysicsLayers = {
    SOLID: 0,
    HERO: 1,
    HERO_DMG: 2,
    ENEMY: 3,
}

class Ball extends v.Area2D {
    constructor(p_radius = 16, color = 0xFFFFFF, should_move = false) {
        super();

        this.should_move = should_move;

        this
            .set_collision_layer_bit(PhysicsLayers.SOLID, true)
            .set_collision_mask_bit(PhysicsLayers.SOLID, true)

        const shape = new v.CircleShape2D();
        shape.radius = p_radius;
        this.add_child(new v.CollisionShape2D())
            .shape = shape;

        this.gfx = this.add_child(new v.Graphics())
            .begin_fill(color, 0.6)
            .draw_circle(0, 0, p_radius)
            .end_fill()

        if (should_move) {
            this.set_physics_process(true);

            this.connect('area_entered', () => {
                this.gfx.tint = 0x00FF00;
                console.log('enter')
            })
            this.connect('area_exited', () => {
                this.gfx.tint = 0xFFFFFF;
                console.log('exit')
            })
        }
    }
    /**
     * @param {Number} delta
     */
    _physics_process(delta) {
        if (this.should_move) {
            this.x += 10 * delta;
        }
    }
}

class Box extends v.Area2D {
    constructor(p_width = 16, p_height, color = 0xFFFFFF, should_move = false) {
        super();

        this.should_move = should_move;

        this
            .set_collision_layer_bit(PhysicsLayers.SOLID, true)
            .set_collision_mask_bit(PhysicsLayers.SOLID, true)

        const shape = new v.RectangleShape2D();
        shape.extents.set(p_width / 2, p_height / 2)
        this.add_child(new v.CollisionShape2D())
            .shape = shape;

        this.gfx = this.add_child(new v.Graphics())
            .begin_fill(color, 0.6)
            .draw_rect(0, 0, p_width, p_height)
            .end_fill()

        if (should_move) {
            this.set_physics_process(true);

            this.connect('area_entered', () => {
                this.gfx.tint = 0x00FF00;
                console.log('enter')
            })
            this.connect('area_exited', () => {
                this.gfx.tint = 0xFFFFFF;
                console.log('exit')
            })
        }
    }
    /**
     * @param {Number} delta
     */
    _physics_process(delta) {
        if (this.should_move) {
            this.x += 10 * delta;
        }
    }
}

export default class NewPhysics extends v.Node2D {
    static instance() {
        return new NewPhysics();
    }

    _enter_tree() {
        const g = this.add_child(new v.Graphics())
            .set_line_style(1, 0xFFFFFF, 0.6, 0.5)

        const size = v.scene_tree.viewport_rect.size;
        const cols = Math.ceil(size.x / 128);
        const rows = Math.ceil(size.y / 128);
        for (let i = 0; i < cols; i++) {
            g.move_to(i * 128, 0).line_to(i * 128, size.y)
        }
        for (let j = 0; j < rows; j++) {
            g.move_to(0, j * 128).line_to(size.x, j * 128);
        }

        const Class = Box;

        const m = new Class(20, 20, 0xFFFFFF, true)
            .set_position(64, 192)
            .set_name('M')
        this.add_child(m);

        const s = new Class(20, 20, 0xFFFFFF)
            .set_position(192, 192)
            .set_name('S')
        this.add_child(s);
    }
}
