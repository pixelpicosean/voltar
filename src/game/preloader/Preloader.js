import * as v from 'engine/index';
import data from './Preloader.json';

export default class Boot extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Boot(), data);
    }

    _enter_tree() {
        const bar = this.get_node('bar');
        const full_bar_width = bar.width;

        let progress_bind = undefined;
        const on_load_progress = (loader) => {
            bar.width = Math.round(full_bar_width * (loader.progress / 100));
        };
        const on_load_complete = () => {
            if (progress_bind) {
                progress_bind.detach();
            }
            v.scene_tree.change_scene_to(v.scene_tree.settings.application.main_scene);
        }

        if (v.scene_tree.preload_queue.length > 0) {
            progress_bind = v.scene_tree.loader.onProgress.add(on_load_progress);
            v.scene_tree.loader.load(on_load_complete);

            bar.width = 0;
        } else {
            bar.width = full_bar_width;
            on_load_complete();
        }
    }
}
