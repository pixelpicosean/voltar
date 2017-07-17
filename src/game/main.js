import * as V from 'engine';
import settings from './settings';


class Scene extends V.Node2D {
    static instance() {
        return new Scene();
    }

    _enter_tree() {
        const gfx = new V.Graphics();
        gfx.name = 'gfx';
        gfx.begin_fill(0xffffff);
        gfx.draw_rect(0, 0, 32, 32);
        gfx.end_fill();
        this.add_child(gfx);
    }
    _ready() {
        console.log('_ready');
        this.set_process(true);
    }
    _process(delta) {
        const gfx = this.get_node('gfx');
        gfx.x += 50 * delta;
        if (gfx.x > 250) {
            gfx.x = 0;
        }
    }
    _exit_tree() {
        console.log('_exit_tree');
    }
}

settings.application.main_scene = Scene;
V.scene_tree.init(settings);
