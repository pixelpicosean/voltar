export class Engine {
    static get_singleton() { return singleton }

    constructor() {
        singleton = this;

        /* public */

        this.iterations_per_second = 60;
        this.physics_jitter_fix = 0.5;
        this.time_scale = 1.0;

        /* private */

        this.in_physics_frame = false;
        this.physics_frames = 0;
        this.idle_frames = 0;

        /** @type {import('engine/scene/main/scene_tree').SceneTree} */
        this.main_loop = null;
    }

    is_in_physics_frame() { return this.in_physics_frame }

    get_main_loop() { return this.main_loop }
}

/** @type {Engine} */
let singleton = null;
