import * as v from 'engine/index';
import { Vector2 } from 'engine/index';

const PhysicsLayers = {
    SOLID: 1,
    HERO: 2,
    HERO_DMG: 3,
    ENEMY: 4,
}

class Bullet extends v.KinematicBody2D {
    static instance() {
        return new Bullet()
    }
    constructor() {
        super();

        this.speed = 200

        this.add_shape(new v.RectangleShape2D(4, 4))
            .set_collision_layer_bit(PhysicsLayers.HERO_DMG, true)

            .set_collision_mask_bit(PhysicsLayers.SOLID, true)
            .set_collision_mask_bit(PhysicsLayers.ENEMY, true)

        this.add_child(new v.Graphics())
            .begin_fill(0xFFFF00, 0.6)
            .draw_rect(-4, -4, 8, 8)
            .end_fill()

        this.velocity = new v.Vector2(this.speed, 0)
        this.motion = new v.Vector2(0, 0)

        this.physics_process = true
    }
    /**
     * @param {number} delta
     */
    _physics_process(delta) {
        const c = this.move_and_collide(this.motion.copy(this.velocity).scale(delta))
        if (c) {
            this.velocity.bounce(c.normal)
        }
    }

    /**
     * @param {number} angle
     * @returns this
     */
    shoot_at(angle) {
        this.velocity.set(this.speed, 0).rotate(angle)
        return this
    }
}

class Box extends v.KinematicBody2D {
    static instance() {
        return new Box()
    }
    constructor() {
        super();

        this.speed = 80

        this.add_shape(new v.RectangleShape2D(10, 10))
            .set_collision_layer_bit(PhysicsLayers.HERO, true)

            .set_collision_mask_bit(PhysicsLayers.SOLID, true)
            .set_collision_mask_bit(PhysicsLayers.ENEMY, true)

        this.add_child(new v.Graphics())
            .begin_fill(0x00FFFF, 0.6)
            .draw_rect(-10, -10, 20, 20)
            .end_fill()

        this.motion = new v.Vector2()

        this.physics_process = true
    }
    /**
     * @param {number} delta
     */
    _physics_process(delta) {
        this.motion.clamp(200)
        let h_sign = 0
        let v_sign = 0
        if (v.input.is_action_pressed('left')) {
            h_sign -= 1
        }
        if (v.input.is_action_pressed('right')) {
            h_sign += 1
        }
        if (v.input.is_action_pressed('up')) {
            v_sign -= 1
        }
        if (v.input.is_action_pressed('down')) {
            v_sign += 1
        }
        this.motion.set(h_sign, v_sign).normalize().scale(this.speed);

        const c = this.move_and_collide(this.motion.scale(delta))
        if (c) {
            this.move_and_collide(this.motion.slide(c.normal))
        }

        if (v.input.is_action_just_pressed('shoot')) {
            this.parent.add_child(Bullet.instance())
                .set_position(this.position)
                .shoot_at(v.input.mouse.angle_to_point(this._world_position))
        }
    }
}

export default class SAT extends v.Node2D {
    static instance() {
        return new SAT();
    }

    _enter_tree() {
        this.create_wall(20, 200, 40, 400)
        this.create_wall(380, 200, 40, 400)
        this.create_wall(200, 20, 400, 40)
        this.create_wall(200, 380, 400, 40)

        this.add_child(new Box())
            .set_position(100, 160)

        v.input.bind('W', 'up')
        v.input.bind('A', 'left')
        v.input.bind('S', 'down')
        v.input.bind('D', 'right')

        v.input.bind('MOUSE', 'shoot')
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    create_wall(x, y, w, h) {
        this.add_child(new v.StaticBody2D())
            .add_shape(new v.RectangleShape2D(w / 2, h / 2))
            .set_collision_layer_bit(1, true)
            .set_position(x, y)
            .add_child(new v.Graphics())
                .begin_fill(0xFFFFFF, 0.4)
                .draw_rect(-w / 2, -h / 2, w, h)
                .end_fill()
    }
}
