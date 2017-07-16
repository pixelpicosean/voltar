import * as V from 'engine';
import settings from './settings';


V.settings.SCALE_MODE = V.SCALE_MODES.NEAREST;


V.loader
    .add('pickup', 'media/health-pack.png');

const tex = V.utils.TextureCache;

class Scene extends V.Node2D {
    static instance() {
        const s = new Scene();
        s.init();
        return s;
    }
    init() {
        V.loader.on('progress', (loader, resource) => {
            console.log(`loading: ${resource.url}`);
            console.log(`progress: ${loader.progress}%`);
        });

        V.loader.load(() => {
            const spr = new V.Sprite(tex['pickup']);
            spr.anchor.set(0.5, 0.5);
            spr.position.set(128, 128);
            spr.scale.set(4);
            spr.interactive = true;
            spr.on('pointerdown', () => console.log('pointer down'));
            this.add_child(spr);

            const gfx = new V.Graphics();
            gfx.set_line_style(4, 0xff0000);
            gfx.move_to(0, 0);
            gfx.line_to(40, 40);
            gfx.begin_fill(0xffffff);
            gfx.draw_rect(0, 0, 32, 32);
            gfx.end_fill();
            this.add_child(gfx);

            const txt = new V.Text();
            txt.text = 'Hello';
            this.add_child(txt);

            console.log('load complete')
        });
    }

    queue_free() {}

    _enter_tree() {
        console.log('_enter_tree');
    }
    _ready() {
        console.log('_ready');
        this.set_process(false);
    }
    _exit_tree() {
        console.log('_exit_tree');
    }
    _process(delta) {
        console.log('_process');
    }
}

settings.application.main_scene = Scene;
V.scene_tree.init(settings);
