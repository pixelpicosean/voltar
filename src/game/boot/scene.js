import * as v from 'engine';
import data from './data.json';


// Which test to run after resources load
import AnimatedSpirteTest from 'game/test/animated-sprite';
import AnimationTest from 'game/test/animation';
import InputTest from 'game/test/input';
import PhysicsTest from 'game/test/physics';
import TilemapTest from 'game/test/tilemap';


v.loader.add('media/04b03.fnt');


const Test = AnimationTest;


export default class Boot extends v.Node2D {
    static instance() {
        return v.assemble_scene(new Boot(), data);
    }

    _enter_tree() {
        let progress_bind = undefined;
        const bar = this.get_node('bar');
        bar.scale.x = 0;

        const load_progress = () => {
            bar.scale.x = v.loader.progress * 0.01;
            console.log(`${v.loader.progress}%`);
        };
        const load_complete = () => {
            if (progress_bind) {
                progress_bind.detach();
            }

            v.scene_tree.change_scene_to(Test);
        }

        if (v.loader._queue._tasks.length > 0) {
            progress_bind = v.loader.onProgress.add(load_progress);
            v.loader.load(load_complete);
        }
        else {
            load_complete();
        }
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}
