import { Color } from "engine/core/color";
import { VObject } from "engine/core/v_object";
import { ProjectSettings } from "engine/core/project_settings";
import { InputMap } from "engine/core/input_map";
import { MessageQueue } from "engine/core/message_queue";
import { OS } from "engine/core/os/os";
import { Engine } from "engine/core/engine";
import { SceneTree } from "engine/scene/main/scene_tree";
import { VisualServer } from "engine/servers/visual_server";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";
import { VSG } from "engine/servers/visual/visual_server_globals";


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

    disable_render_loop: false,

    force_redraw_requested: false,

    /** @type {Engine} */
    engine: null,
    /** @type {SceneTree} */
    tree: null,
    /** @type {ProjectSettings} */
    global: null,
    /** @type {InputMap} */
    input_map: null,

    events: new VObject(),

    /**
     * Pass as much settings as you want, but next one will be merged into previous
     * @param {...import("engine/core/project_settings").Settings} settings
     */
    setup(...settings) {
        os = new OS();
        os.initialize_core();

        this.engine = new Engine();

        this.global = new ProjectSettings(...settings);
        this.input_map = new InputMap();

        this.input_map.load_from_globals();

        message_queue = new MessageQueue();

        os.video_mode.width = this.global.display.width;
        os.video_mode.height = this.global.display.height;
        os.video_mode.resizable = this.global.display.resizable;
        os.screen_orientation = this.global.display.orientation;

        document.title = this.global.application.name;

        window.addEventListener('load', this.setup2, false);
        document.addEventListener('DOMContentLoaded', this.setup2, false);
    },

    setup2() {
        window.removeEventListener('load', this.setup2, false);
        document.removeEventListener('DOMContentLoaded', this.setup2, false);

        os.initialize(/** @type {HTMLCanvasElement} */(document.getElementById('game')), this.global);

        VSG.viewport.set_default_clear_color(Color.hex(this.global.display.background_color));

        physics_2d_server = new Physics2DServer();
        physics_2d_server.init();

        this.start();
    },

    start() {
        scene_tree = new SceneTree();
        scene_tree.init();
        scene_tree.stretch_mode = this.global.display.stretch_mode;
        scene_tree.stretch_aspect = this.global.display.stretch_aspect;

        this.engine.set_main_loop(scene_tree);
        this.engine.use_pixel_snap = this.global.display.pixel_snap;

        // TODO: autoload first pass, load constants
        // TODO: autoload second pass, instantiate nodes into global constants

        // read and apply global settings

        this.events.emit_signal('started');

        const scene = this.global.application.main_scene.instance();
        scene_tree.add_current_scene(scene);

        os.set_main_loop(scene_tree);

        this.start_loop();

        console.log(`[Voltar] driver: ${this.global.display.webgl2 ? 'WebGL2' : 'WebGL'}, antialias: ${this.global.display.antialias ? 'ON' : 'OFF'}`)
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

        // limit step to not larger than min update step
        step = Math.min(step, this.global.application.min_update_step);

        const time_scale = Engine.get_singleton().time_scale;
        const scaled_step = step * time_scale;

        const max_physics_steps = 1;
        const frame_slice = scaled_step / max_physics_steps;

        Engine.get_singleton().in_physics_frame = true;
        for (let iters = 0; iters < max_physics_steps; iters++) {
            Physics2DServer.get_singleton().sync();
            Physics2DServer.get_singleton().flush_queries();

            SceneTree.get_singleton().iteration(frame_slice);

            MessageQueue.get_singleton().flush();

            Physics2DServer.get_singleton().end_sync();
            Physics2DServer.get_singleton().step(frame_slice);

            MessageQueue.get_singleton().flush();

            Engine.get_singleton().physics_frames++;
        }
        Engine.get_singleton().in_physics_frame = false;

        SceneTree.get_singleton().idle(scaled_step);
        MessageQueue.get_singleton().flush();

        VisualServer.get_singleton().sync();

        if (OS.get_singleton().can_draw() && !this.disable_render_loop) {
            // TODO: force_redraw_requested && is_in_low_processor_usage_mode()
            VisualServer.get_singleton().draw(scaled_step);
            Engine.get_singleton().frames_drawn++;
            this.force_redraw_requested = false;
        }

        this.frames++;
        Engine.get_singleton().idle_frames++;
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
