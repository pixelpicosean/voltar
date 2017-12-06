import * as v from 'engine';
import data from './data.json';


// Which test to run after resources load
import AnimatedSpirteTest from 'game/test/animated-sprite';
import AnimationTest from 'game/test/animation';
import InputTest from 'game/test/input';
import PhysicsTest from 'game/test/physics';
import TilemapTest from 'game/test/tilemap';
import SoundTest from 'game/test/sound';
import CoaTest from 'game/test/coa';
import TextTest from 'game/test/text';


const FirstScene = CoaTest;


export default class Boot extends v.Node2D {
    static instance() {
        const width = v.scene_tree.viewport_rect.size.x;
        const height = v.scene_tree.viewport_rect.size.y;

        const bar_width = Math.floor(width * 0.5);
        const bar_height = Math.floor(bar_width * 0.075);

        data.children[0].width = data.children[1].width = bar_width;
        data.children[0].height = data.children[1].height = bar_height;

        data.children[0].x = data.children[1].x = Math.floor((width - bar_width) * 0.5);
        data.children[0].y = data.children[1].y = Math.floor((height - bar_height) * 0.5);

        return v.assemble_scene(new Boot(), data);
    }

    _enter_tree() {
        let progress_bind = undefined;
        const bar = this.get_node('bar');
        bar.scale.x = 0;

        const load_progress = () => {
            bar.scale.x = v.loader.progress * 0.01;
        };
        const load_complete = () => {
            bar.scale.x = 1;

            if (progress_bind) {
                progress_bind.detach();
            }

            v.scene_tree.change_scene_to(FirstScene);
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
