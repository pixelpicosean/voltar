import * as v from 'engine';
import settings from './settings';


class CollisionObject2D extends v.Node2D {
    static new() {
        return new CollisionObject2D();
    }

    constructor() {
        super();
    }

    _enter_tree() {
        const gfx = new v.Graphics();
        gfx.name = 'gfx';
        gfx.begin_fill(0xffffff);
        gfx.draw_rect(-16, -16, 32, 32);
        gfx.end_fill();
        this.add_child(gfx);
    }
    _ready() {
        this.set_process(true);
    }
    _process(delta) {}
    _exit_tree() {}
}


class Scene extends v.Node2D {
    static instance() {
        return new Scene();
    }

    _enter_tree() {
        const c = CollisionObject2D.new();
        c.position.set(200, 125);
        this.add_child(c);
    }
    _ready() {}
    _process(delta) {}
    _exit_tree() {}
}

settings.application.main_scene = Scene;
v.scene_tree.init(settings);
