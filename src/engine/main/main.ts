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
import { MainTimerSync } from "./main_timer_sync";
import Stats from "engine/utils/stats";

let message_queue: MessageQueue = null;

let os: OS = null;

let physics_2d_server: Physics2DServer = null;

let scene_tree: SceneTree = null;

let main_timer_sync = new MainTimerSync;
let fixed_fps = -1;

let physics_process_max = 0;
let idle_process_max = 0;

const stats = Stats();

export const Main = {
    last_ticks: 0,
    target_ticks: 0,

    frames: 0,
    frame: 0,

    raf_id: -1,
    iterating: 0,

    disable_render_loop: false,

    force_redraw_requested: false,

    engine: null as Engine,
    tree: null as SceneTree,
    global: null as ProjectSettings,
    input_map: null as InputMap,

    events: new VObject,

    /**
     * Pass as much settings as you want, but next one will be merged into previous
     */
    setup(...settings: import("engine/core/project_settings").Settings[]) {
        os = new OS;
        os.initialize_core();

        this.engine = new Engine;

        this.global = new ProjectSettings(...settings);
        this.input_map = new InputMap;

        this.input_map.load_from_globals();

        message_queue = new MessageQueue;

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

        os.initialize(document.getElementById('game') as HTMLCanvasElement, this.global);

        VSG.viewport.set_default_clear_color(Color.hex(this.global.display.background_color));

        physics_2d_server = new Physics2DServer;
        physics_2d_server.init();

        this.start();
    },

    start() {
        main_timer_sync.init(os.get_ticks_usec());

        scene_tree = new SceneTree;
        scene_tree.init();
        scene_tree.stretch_mode = this.global.display.stretch_mode;
        scene_tree.stretch_aspect = this.global.display.stretch_aspect;

        this.engine.set_main_loop(scene_tree);
        this.engine.use_pixel_snap = this.global.display.pixel_snap;
        this.engine.snap_2d_transform = this.global.display.snap_2d_transform;

        // @Incomplete: autoload first pass, load constants
        // @Incomplete: autoload second pass, instantiate nodes into global constants

        // read and apply global settings

        let root = scene_tree.get_root();
        let shadow_atlas_size = 2048 * 2;
        root.set_shadow_atlas_size(shadow_atlas_size);
        root.set_shadow_atlas_quadrant_subdiv(0, 1);
        root.set_shadow_atlas_quadrant_subdiv(1, 2);
        root.set_shadow_atlas_quadrant_subdiv(2, 3);
        root.set_shadow_atlas_quadrant_subdiv(3, 4);

        this.events.emit_signal('started');

        const scene = this.global.application.main_scene.instance();
        scene_tree.add_current_scene(scene);

        os.set_main_loop(scene_tree);

        this.start_loop();

        console.log(`[Voltar] driver: ${this.global.display.webgl2 ? 'WebGL2' : 'WebGL'}, antialias: ${this.global.display.antialias ? 'ON' : 'OFF'}`)

        document.body.appendChild(stats.dom);
    },

    iteration(timestamp: number) {
        stats.begin();

        this.iterating++;

        let ticks = OS.get_singleton().get_ticks_usec();
        Engine.get_singleton().frame_ticks = ticks;
        main_timer_sync.set_cpu_ticks_usec(ticks);
        main_timer_sync.set_fixed_fps(fixed_fps);

        let ticks_elapsed = ticks - this.last_ticks;

        let physics_fps = Engine.get_singleton().ips;
        let frame_slice = 1.0 / physics_fps;

        const time_scale = Engine.get_singleton().time_scale;

        let advance = main_timer_sync.advance(frame_slice, physics_fps);
        let step = advance.idle_step;
        let scaled_step = step * time_scale;

        Engine.get_singleton().frame_step = step;
        Engine.get_singleton().physics_interpolation_fraction = advance.interpolation_fraction;

        let physics_process_ticks = 0;
        let idle_process_ticks = 0;

        this.frame += ticks_elapsed;

        this.last_ticks = ticks;

        const max_physics_steps = 8;
        if (fixed_fps === -1 && advance.physics_steps > max_physics_steps) {
            step -= (advance.physics_steps - max_physics_steps) * frame_slice;
            advance.physics_steps = max_physics_steps;
        }

        Engine.get_singleton().in_physics_frame = true;

        for (let iters = 0; iters < advance.physics_steps; iters++) {
            let physics_begin = os.get_ticks_usec();

            // @Incomplete: PhysicsServer.get_singleton().flush_queries();

            Physics2DServer.get_singleton().sync();
            Physics2DServer.get_singleton().flush_queries();

            SceneTree.get_singleton().iteration(frame_slice * time_scale);

            message_queue.flush();

            // @Incomplete: PhysicsServer.get_singleton().step(frame_slice * time_scale);

            Physics2DServer.get_singleton().end_sync();
            Physics2DServer.get_singleton().step(frame_slice * time_scale);

            message_queue.flush();

            physics_process_ticks = Math.max(physics_process_ticks, os.get_ticks_usec() - physics_begin);
            physics_process_max = Math.max(os.get_ticks_usec() - physics_begin, physics_process_max);
            Engine.get_singleton().physics_frames++;
        }

        Engine.get_singleton().in_physics_frame = false;

        let idle_begin = os.get_ticks_usec();

        SceneTree.get_singleton().idle(step * time_scale);
        message_queue.flush();

        VisualServer.get_singleton().sync();

        if (OS.get_singleton().can_draw() && !this.disable_render_loop) {
            // @Iincomplete: force_redraw_requested && is_in_low_processor_usage_mode()
            VisualServer.get_singleton().draw(scaled_step);
            Engine.get_singleton().frames_drawn++;
            this.force_redraw_requested = false;
        }

        idle_process_ticks = os.get_ticks_usec() - idle_begin;
        idle_process_max = Math.max(idle_process_ticks, idle_process_max);

        // @Incomplete: update audio server

        this.frames++;
        Engine.get_singleton().idle_frames++;
        if (this.frame > 1000000) {
            Engine.get_singleton().fps = this.frames;
            idle_process_max = 0;
            physics_process_max = 0;

            this.frame %= 1000000;
            this.frames = 0;
        }

        this.iterating--;

        stats.end();

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
