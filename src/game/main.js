import * as V from 'engine';


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
            this.addChild(spr);

            const gfx = new V.Graphics();
            gfx.beginFill(0xffffff);
            gfx.drawRect(0, 0, 32, 32);
            gfx.endFill();
            this.addChild(gfx);

            const txt = new V.Text();
            txt.text = 'Hello';
            this.addChild(txt);

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

V.scene_tree.init({
    width: 256,
    height: 256,

    main_scene: Scene,
});
