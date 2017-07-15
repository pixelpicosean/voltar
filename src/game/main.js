import * as PIXI from 'engine';
import scene_tree from './SceneTree';


PIXI.loader
    .add('pickup', 'media/health-pack.png');

const tex = PIXI.utils.TextureCache;

class Scene extends PIXI.Container {
    static instance() {
        const s = new Scene();
        s.init();
        return s;
    }
    init() {
        PIXI.loader.on('progress', (loader, resource) => {
            console.log(`loading: ${resource.url}`);
            console.log(`progress: ${loader.progress}%`);
        });

        PIXI.loader.load(() => {
            const spr = new PIXI.Sprite(tex['pickup']);
            spr.anchor.set(0.5, 0.5);
            spr.position.set(128, 128);
            spr.scale.set(4);
            this.addChild(spr);

            console.log('load complete')
        });
    }

    free() {}
    queue_free() {}

    _enter_tree() {}
    _ready() {}
    _exit_tree() {}
    _process(delta) {}
}

scene_tree.init({
    width: 256,
    height: 256,

    main_scene: Scene,
});
