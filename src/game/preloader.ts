import * as v from 'engine/index';

import { get_loading_progress } from 'engine/core/io/loader';

type TargetScene = string | { new(): v.Node };

let main_scene: TargetScene = null;

class PreloaderScene extends v.Node {
    static instance() { return new PreloaderScene }

    current_progress = 0.0;

    bar_width = 0;

    bar_fill: v.ColorRect;

    _enter_tree() {
        const size = v.OS.get_window_size();

        const bar_width = size.width * 0.6;
        const bar_height = bar_width * 0.01;
        const bar_offset_y = 200;

        const bar_bg = new v.ColorRect;
        this.add_child(bar_bg);
        bar_bg.set_color_n(0.5, 0.5, 0.5);
        bar_bg.set_rect_position_n((size.width - bar_width) / 2, (size.height - bar_height) / 2 + bar_offset_y);
        bar_bg.set_rect_size_n(bar_width, bar_height);

        const bar_fill = new v.ColorRect;
        this.add_child(bar_fill);
        bar_fill.set_color_n(0.8, 0.8, 0.8);
        bar_fill.set_rect_position_n((size.width - bar_width) / 2, (size.height - bar_height) / 2 + bar_offset_y);
        bar_fill.set_rect_size_n(1, bar_height);

        this.bar_width = bar_width;
        this.bar_fill = bar_fill;

        v.Engine.start_preload(() => {
            this.on_resource_loaded();
        });

        this.set_process(true)
    }

    _process(delta: number) {
        let progress = get_loading_progress();

        if (progress < 1) {
            /* slowly catch real progress */
            this.current_progress += (progress - this.current_progress) * delta * 0.8;
        } else {
            /* fast approach */
            this.current_progress = Math.min(this.current_progress + delta, 1);
        }

        this.bar_fill.set_rect_size_n(this.bar_width * this.current_progress, this.bar_fill.rect_size.y);

        if (this.current_progress === 1) {
            this.set_process(false);
            this.goto_next_scene();
        }
    }

    goto_next_scene() {
        if (typeof (main_scene) === 'string') {
            this.get_tree().change_scene(main_scene);
        } else {
            this.get_tree().change_scene_to(main_scene);
        }
    }

    on_resource_loaded() {
        // resource loading finished
    }
}

export function Preloader(scene: TargetScene) {
    main_scene = scene;
    return PreloaderScene;
}
