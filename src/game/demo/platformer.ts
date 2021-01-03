import * as v from 'engine/index';

export class Platformer extends v.Node2D {
    player: v.KinematicBody2D;
    velocity = new v.Vector2;

    _ready() {
        this.player = this.get_node("player") as v.KinematicBody2D;

        this.set_physics_process(true);
    }

    _physics_process(delta: number) {
        let dir = v.Input.get_action_strength("ui_right") - v.Input.get_action_strength("ui_left");
        this.velocity.x = dir * 240.0;

        this.velocity.y += 900.0 * delta;
        if (v.Input.is_action_just_pressed("ui_up")) {
            this.velocity.y = -540.0;
        }
        this.velocity.y = v.clamp(this.velocity.y, -800.0, 900.0);

        let vel = this.player.move_and_slide(this.velocity, v.Vector2.UP);
        this.velocity.copy(vel);
        v.Vector2.free(vel);
    }
}

v.attach_script('res://scene/platformer.tscn', Platformer);
