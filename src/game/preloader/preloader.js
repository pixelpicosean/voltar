import * as v from 'engine/index';
import data from './preloader.json';

export default class Boot extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Boot(), data);
    }

    _enter_tree() {
        const bg = /** @type {v.Sprite} */(this.get_node('bg'))
            .set_visible(true)
            .set_anchor(0, 0.5)

        const bar = /** @type {v.Sprite} */ (this.get_node('bar'))
            .set_anchor(0, 0.5)

        const bar_width_pct = 0.8;
        const full_bar_scale = v.scene_tree.viewport_rect.size.width * bar_width_pct / bar.texture.width;
        bg.scale.x = full_bar_scale;
        bg.scale.y = full_bar_scale * 0.02;

        bar.scale.x = 0;
        bar.scale.y = bg.scale.y;

        bg.x = bar.x = v.scene_tree.viewport_rect.size.width * ((1 - bar_width_pct) / 2);
        bg.y = bar.y = v.scene_tree.viewport_rect.size.y / 2;

        bar.visible = true;

        const on_load_progress = (/** @type {v.Loader} */loader) => {
            bar.scale.x = (loader.progress / 100) * full_bar_scale;
        };
        const on_load_complete = () => {
            bar.scale.x = 1.0;

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
