import * as v from 'engine/index';

v.preload('bgm', 'media/music/bgm.ogg');
v.preload('fx_json', 'media/sound/fx.json');
v.preload('fx', 'media/sound/fx.ogg');
// v.loader.onComplete.once(() => {
//     v.sound
//         .find('fx')
//         .addSprites(v.loader.resources['fx_json'].data.spritemap);
// });

export default class SoundTest extends v.Node2D {
    static instance() {
        return new SoundTest();
    }

    _enter_tree() {}
    _ready() {
        const bgm = v.sound.find('bgm');
        bgm.filters = [
            new v.audio.filters.ReverbFilter(),
        ];
        bgm.volume = 0.2;
        bgm.play();
    }
}
