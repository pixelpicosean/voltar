import * as v from 'engine/index';
// import data from './Boot.json';

export default class Boot extends v.Node2D {
    static instance() {
        // return v.assemble_scene(new Boot(), data);
        return new Boot()
    }

    _enter_tree() {
        let progress_bind = undefined;
        const on_load_progress = () => {};
        const on_load_complete = () => {
            if (progress_bind) {
                progress_bind.detach();
            }
            v.scene_tree.change_scene_to(v.scene_tree.settings.application.main_scene);
        }

        if (v.scene_tree.preload_queue.length > 0) {
            progress_bind = v.scene_tree.loader.onProgress.add(on_load_progress);
            v.scene_tree.loader.load(on_load_complete);
        } else {
            on_load_complete();
        }
    }
}
