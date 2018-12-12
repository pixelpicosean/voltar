import * as v from 'engine/index';

const PhysicsLayers = {
    SOLID: 0,
    HERO: 1,
    HERO_DMG: 2,
    ENEMY: 3,
}

class Ball extends v.KinematicBody2D {
    constructor(p_radius = 16, color = 0xFFFFFF, ray_length = 40) {
        super();

        this.velocity = new v.Vector2();
        this.motion = new v.Vector2();
        this.ray_result = new v.RayResult();
        this.ray_length = ray_length;

        this
            .set_collision_layer_bit(PhysicsLayers.SOLID, true)
            .set_collision_mask_bit(PhysicsLayers.SOLID, true)

        this.add_child(new v.CollisionShape2D())
            .set_shape(
                new v.CircleShape2D().set_radius(p_radius)
            );

        this.gfx = this.add_child(new v.Graphics())
            .begin_fill(color, 0.6)
            .draw_circle(0, 0, p_radius)
            .end_fill()
            .set_line_style(2, 0x00FFFF, 0.8)
            .move_to(0, 0)
            .line_to(ray_length, 0)

        this.set_physics_process(true);
    }
    _ready() {
        this.velocity.set(20, 0);
    }
    /**
     * @param {Number} delta
     */
    _physics_process(delta) {
        const col = this.move_and_collide(this.motion.copy(this.velocity).scale(delta));
        if (col) {
            // console.log(`collide with something`)
            this.velocity.bounce(col.normal);
        }

        // test raycast
        const res = this.get_world_2d().direct_space_state.intersect_ray(this.get_global_position(), this.get_global_position().clone().add(this.ray_length, 0), this.ray_result);
        if (res) {
            console.log('ray hit')
        }
    }
}

class Box extends v.StaticBody2D {
    constructor(p_width = 16, p_height = 16, color = 0xFFFFFF) {
        super();

        this
            .set_collision_layer_bit(PhysicsLayers.SOLID, true)
            .set_collision_mask_bit(PhysicsLayers.SOLID, true)

        this.add_child(new v.CollisionShape2D())
            .set_shape(
                new v.RectangleShape2D().set_extents(p_width / 2, p_height / 2)
            );

        this.gfx = this.add_child(new v.Graphics())
            .begin_fill(color, 0.6)
            .draw_rect(-p_width / 2, -p_height / 2, p_width, p_height)
            .end_fill()
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

        const s = new Box(40, 40, 0xFFFFFF)
            .set_position(192, 192 + 32)
            .set_rotation(Math.PI * 0.25)
            .set_name('S')
        this.add_child(s);

        const sa = new Ball(20, 0xFFFFFF, 48)
            .set_position(64, 192 + 16)
            .set_name('M')
        this.add_child(sa);
    }
}
