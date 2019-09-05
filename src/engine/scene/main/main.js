import { mixins } from "engine/utils/index";
import { ProjectSettings } from "engine/core/project_settings";
import SceneTree from "./scene_tree";
import MessageQueue from "engine/core/message_queue";

export const Main = {
    last_ticks: 0,
    target_ticks: 0,

    frames: 0,
    frame: 0,

    raf_id: -1,
    iterating: 0,

    force_redraw_requested: 0,

    /** @type {SceneTree} */
    tree: null,
    /** @type {ProjectSettings} */
    global: null,

    /**
     * @param {import("engine/core/project_settings").Settings} settings
     */
    setup(settings) {
        // Handle mixins now, after all code has been added
        mixins.perform_mixins();

        this.tree = new SceneTree();
        this.global = new ProjectSettings(settings);

        document.title = this.global.application.name;

        window.addEventListener('load', this.start, false);
        document.addEventListener('DOMContentLoaded', this.start, false);
    },

    start() {
        window.removeEventListener('load', this.start, false);
        document.removeEventListener('DOMContentLoaded', this.start, false);

        const scene = this.global.application.preloader.instance();

        SceneTree.get_singleton().init();
        SceneTree.get_singleton().add_current_scene(scene);

        this.start_loop();
    },

    /**
     * @param {number} timestamp
     */
    iteration(timestamp) {
        this.iterating++;

        let step = 0;
        if (this.last_ticks > 0) {
            step = timestamp - this.last_ticks;
        }
        this.last_ticks = timestamp;

        const max_physics_steps = 4;
        const frame_slice = step / max_physics_steps;

        for (let iters = 0; iters < max_physics_steps; iters++) {
            // Physics2DServer.get_singleton().sync();
            // Physics2DServer.get_singleton().flush_queries();

            SceneTree.get_singleton().iteration(frame_slice);

            MessageQueue.get_singleton().flush();

            // Physics2DServer.get_singleton().end_sync();
            // Physics2DServer.get_singleton().step(frame_slice);

            MessageQueue.get_singleton().flush();
        }

        SceneTree.get_singleton().idle(step);
        MessageQueue.get_singleton().flush();

        // VisualServer.get_singleton().sync();

        this.frames++;
        if (this.frame > 1000000) {
            // TODO: calculation FPS
            this.frame %= 1000000;
            this.frames = 0;
        }

        this.iterating--;
    },

    start_loop() {
        this.raf_id = requestAnimationFrame(this.iteration);
    },
    end_loop() {
        cancelAnimationFrame(this.raf_id);
    },
};

Main.start = Main.start.bind(Main);
Main.iteration = Main.iteration.bind(Main);
