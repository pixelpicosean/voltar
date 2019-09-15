import { ProjectSettings } from "engine/core/project_settings";
import { InputMap } from "engine/core/input_map";
import { MessageQueue } from "engine/core/message_queue";
import { OS } from "engine/core/os/os";
import { Engine } from "engine/core/engine";
import { SceneTree } from "engine/scene/main/scene_tree";
import { VisualServer } from "engine/servers/visual_server";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";


/** @type {MessageQueue} */
let message_queue = null;

/** @type {OS} */
let os = null;

/** @type {Physics2DServer} */
let physics_2d_server = null;

/** @type {SceneTree} */
let scene_tree = null;

export const Main = {
    last_ticks: 0,
    target_ticks: 0,

    frames: 0,
    frame: 0,

    raf_id: -1,
    iterating: 0,

    force_redraw_requested: false,

    /** @type {Engine} */
    engine: null,
    /** @type {SceneTree} */
    tree: null,
    /** @type {ProjectSettings} */
    global: null,
    /** @type {InputMap} */
    input_map: null,

    /**
     * @param {import("engine/core/project_settings").Settings} settings
     */
    setup(settings) {
        os = new OS();
        os.initialize_core();

        this.engine = new Engine();

        this.global = new ProjectSettings(settings);
        this.input_map = new InputMap();

        this.input_map.load_from_globals();

        message_queue = new MessageQueue();

        os.screen_orientation = this.global.display.orientation;
        window.addEventListener('load', this.setup2, false);
        document.addEventListener('DOMContentLoaded', this.setup2, false);
    },

    setup2() {
        window.removeEventListener('load', this.setup2, false);
        document.removeEventListener('DOMContentLoaded', this.setup2, false);

        os.initialize({
            canvas: /** @type {HTMLCanvasElement} */(document.getElementById('game')),
            size: { x: this.global.display.width, y: this.global.display.height },
        });

        physics_2d_server = new Physics2DServer();
        physics_2d_server.init();

        this.start();
    },

    start() {
        scene_tree = new SceneTree();
        SceneTree.get_singleton().init();
        this.engine.set_main_loop(scene_tree);

        // TODO: autoload first pass, load constants
        // TODO: autoload second pass, instantiate nodes into global constants

        // TODO: load and setup screen stretch

        // read and apply global settings
        document.title = this.global.application.name;

        // load and start main scene (preloader here instead)
        const scene = this.global.application.preloader.instance();
        scene_tree.add_current_scene(scene);

        os.set_main_loop(scene_tree);

        this.start_loop();
    },

    /**
     * @param {number} timestamp
     */
    iteration(timestamp) {
        this.iterating++;

        let step = 0;
        if (this.last_ticks > 0) {
            step = (timestamp - this.last_ticks) * 0.001;
        }
        this.last_ticks = timestamp;

        // TODO: scaled_step = step * time_scale;
        const scaled_step = step * 1.0;

        const max_physics_steps = 4;
        const frame_slice = scaled_step / max_physics_steps;

        for (let iters = 0; iters < max_physics_steps; iters++) {
            // Physics2DServer.get_singleton().sync();
            // Physics2DServer.get_singleton().flush_queries();

            SceneTree.get_singleton().iteration(frame_slice);

            MessageQueue.get_singleton().flush();

            // Physics2DServer.get_singleton().end_sync();
            // Physics2DServer.get_singleton().step(frame_slice);

            MessageQueue.get_singleton().flush();
        }

        SceneTree.get_singleton().idle(scaled_step);
        MessageQueue.get_singleton().flush();

        VisualServer.get_singleton().sync();

        // TODO: if (can_draw() && !disable_render_loop)
        // TODO: force_redraw_requested && is_in_low_processor_usage_mode()
        VisualServer.get_singleton().draw(scaled_step);
        this.force_redraw_requested = false;

        this.frames++;
        if (this.frame > 1000000) {
            // TODO: calculation FPS
            this.frame %= 1000000;
            this.frames = 0;
        }

        this.iterating--;

        this.raf_id = requestAnimationFrame(this.iteration);
    },

    start_loop() {
        this.raf_id = requestAnimationFrame(this.iteration);
    },
    end_loop() {
        cancelAnimationFrame(this.raf_id);
    },
};

Main.setup2 = Main.setup2.bind(Main);
Main.iteration = Main.iteration.bind(Main);