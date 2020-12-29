import * as v from 'engine/index.js';

export class Demo extends v.Spatial {
    sentry: v.Spatial;
    sentry_animator: v.AnimationPlayer;

    async _ready() {
        this.get_tree().create_timer(15).connect_once("timeout", () => {
            this.get_tree().change_scene("res://scene/demo.tscn");
        });

        this.sentry = this.get_node("scene/player") as v.Spatial;
        this.sentry.set_rotation_degrees_n(0, 100, 0);

        this.sentry_animator = this.sentry.get_node("AnimationPlayer") as v.AnimationPlayer;
        this.sentry_animator.play("idle");

        await v.yield(this.get_tree().create_timer(3.8), "timeout");

        this.sentry_animator.play("run");

        await v.yield(this.get_tree().create_timer(12.2 - 3.8), "timeout");

        this.sentry_animator.play("idle");
    }
}

v.attach_script('res://scene/baked_light.tscn', Demo);
