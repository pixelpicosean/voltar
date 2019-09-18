import * as v from 'engine/index';

let main_scene = null;

class PreloaderScene extends v.Node {
    static instance() { return new PreloaderScene() }

    constructor() {
        super();

        this.current_pct = 0;
        this.target_pct = 0;

        this.average_speed = 0;
        this.timer = 0;

        this.bar_width = 0;

        /** @type {v.ColorRect} */
        this.bar_fill = null;
    }

    _enter_tree() {
        const size = v.OS.get_window_size();

        const bar_width = size.width * 0.9;
        const bar_height = bar_width * 0.01;

        const bar_bg = new v.ColorRect();
        this.add_child(bar_bg);
        bar_bg.set_color_n(0.5, 0.5, 0.5);
        bar_bg.set_rect_position_n((size.width - bar_width) / 2, (size.height - bar_height) / 2);
        bar_bg.set_rect_size_n(bar_width, bar_height);

        const bar_fill = new v.ColorRect();
        this.add_child(bar_fill);
        bar_fill.set_color_n(0.8, 0.8, 0.8);
        bar_fill.set_rect_position_n((size.width - bar_width) / 2, (size.height - bar_height) / 2);
        bar_fill.set_rect_size_n(1, bar_height);

        this.bar_width = bar_width;
        this.bar_fill = bar_fill;

        v.Engine.start_preload((progress) => {
            this.average_speed = (this.average_speed + (progress * 0.001 - this.target_pct) / this.timer) / 2;
            this.target_pct = progress * 0.001;
            this.timer = 1 / 60;
        }, () => {
            this.target_pct = 1;
            this.on_resource_loaded();
        })

        this.set_process(true)
    }

    /**
     * @param {number} delta
     */
    _process(delta) {
        this.timer += delta;
        this.current_pct += this.average_speed * delta;
        this.current_pct = Math.min(this.current_pct, this.target_pct);

        this.bar_fill.set_rect_size_n(this.bar_width * this.current_pct, this.bar_fill.rect_size.y);

        if (this.current_pct >= 1) {
            this.on_loading_bar_filled();
            this.set_process(false);
        }
    }

    on_resource_loaded() { }

    on_loading_bar_filled() {
        if (typeof(main_scene) === 'string') {
            this.get_tree().change_scene(main_scene);
        } else {
            this.get_tree().change_scene_to(main_scene);
        }
    }
}
v.GDCLASS(PreloaderScene, v.Node)

export function Preloader(scene) {
    main_scene = scene;
    return PreloaderScene;
}
