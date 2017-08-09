import * as v from 'engine';
import data from './data.json';


export default class Boot extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Boot(), data);
    }

    _enter_tree() {}
    _ready() {
        let progress_bind = undefined;
        const bar = this.get_node("bar");

        const load_progress = () => {
            bar.scale.x = v.loader.progress * 0.01;
            console.log(`${v.loader.progress}%`);
        };
        const load_complete = () => {
            if (progress_bind) {
                progress_bind.detach();
            }
        }

        if (v.loader._queue._tasks.length > 0) {
            progress_bind = v.loader.onProgress.add(load_progress);
            v.loader.load(load_complete);
        }
        else {
            load_complete();
        }
    }
    _process(delta) {}
    _exit_tree() {}
}
