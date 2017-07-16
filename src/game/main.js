import * as V from 'engine';
import settings from './settings';


V.settings.SCALE_MODE = V.SCALE_MODES.NEAREST;


V.loader
    .add('pickup', 'media/health-pack.png')
    .add('explo', 'media/explode.mp3')

const tex = V.utils.TextureCache;

class Scene extends V.Node2D {
    static instance() {
        return new Scene();
    }

    _enter_tree() {
        const spr = new V.Sprite();
        spr.name = 'spr';
        spr.anchor.set(0.5, 0.5);
        spr.position.set(128, 128);
        spr.scale.set(4);
        spr.interactive = true;
        spr.on('pointerdown', () => console.log('pointer down'));
        this.add_child(spr);

        const gfx = new V.Graphics();
        gfx.name = 'gfx';
        gfx.set_line_style(4, 0xff0000);
        gfx.move_to(0, 0);
        gfx.line_to(40, 40);
        gfx.begin_fill(0xffffff);
        gfx.draw_rect(0, 0, 32, 32);
        gfx.end_fill();
        this.add_child(gfx);

        const txt = new V.Text();
        txt.name = 'txt';
        txt.text = 'Hello';
        gfx.add_child(txt);

        V.loader.on('progress', (loader, resource) => {
            console.log(`loading: ${resource.url}`);
            console.log(`progress: ${loader.progress}%`);
        });

        V.loader.load(() => {
            V.sound.play('explo');

            spr.texture = tex['pickup'];

            console.log('load complete');
        });
    }
    _ready() {
        console.log('_ready');
        this.set_process(true);
    }
    _process(delta) {
        const gfx = this.get_node('gfx/txt/..');
        gfx.x += 50 * delta;
        if (gfx.x > 250) {
            gfx.x = 0;
        }

        const spr = this.get_node('/spr');
        spr.y += 40 * delta;
        if (spr.y > 200) {
            spr.y = 0;
        }
    }
    _exit_tree() {
        console.log('_exit_tree');
    }
}

settings.application.main_scene = Scene;
V.scene_tree.init(settings);
