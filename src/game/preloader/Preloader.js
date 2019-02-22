import * as v from 'engine/index';
import data from './Preloader.json';

export default class Boot extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Boot(), data);
    }

    _enter_tree() {
        const bg = this.get_node('bg').set_visible(true);

        const bar = /** @type {v.Sprite} */ (this.get_node('bar'));
        const full_bar_width = bar.width;

        bg.x = bar.x = v.scene_tree.viewport_rect.size.x / 2;
        bg.y = bar.y = v.scene_tree.viewport_rect.size.y / 2;
        bar.width = 0;
        bar.visible = true;

        const on_load_progress = (/** @type {v.Loader} */loader) => {
            bar.width = Math.round(full_bar_width * (loader.progress / 100));
        };
        const on_load_complete = () => {
            bar.width = full_bar_width;

            v.scene_tree.loader.disconnect('progress', on_load_progress);

            const main_scene = v.scene_tree.settings.application.main_scene;
            if (typeof (main_scene) === 'string') {
                v.scene_tree.change_scene(main_scene);
            } else {
                v.scene_tree.change_scene_to(main_scene);
            }
        }

        v.scene_tree.loader.connect('progress', on_load_progress);
        v.scene_tree.loader.load(on_load_complete);
    }
}
