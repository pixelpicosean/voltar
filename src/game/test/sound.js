import * as v from 'engine';


v.loader.add('bgm', 'media/music/bgm.{m4a,ogg,ac3,mp3}');
v.loader.add('fx_json', 'media/sound/fx.json');
v.loader.add('fx', 'media/sound/fx.{m4a,ogg,ac3,mp3}');
v.loader.onComplete.once(() => {
    v.sound
        .find('fx')
        .addSprites(v.loader.resources['fx_json'].data.spritemap);
});


export default class SoundTest extends v.Node2D {
    static instance() {
        return new SoundTest();
    }

    _enter_tree() {}
    _ready() {
        const bgm = v.sound.find('bgm');
        bgm.filters = [
            new v.audio.filters.StereoFilter(-1),
            new v.audio.filters.ReverbFilter(),
        ];
        bgm.play();

        let timer = this.tweens.add(new v.Tween());
        timer.repeat = true;
        timer.interpolate_callback(this, 0.2, 'play', undefined);
        // timer.start();
    }
    _process(delta) {}
    _exit_tree() {}

    play() {
        v.sound
            .find('fx')
            .play({
                volume: 0.25,
                sprite: v.pick([
                    'button',
                    'cash',
                    'hiscore',
                    'hit',
                    'sound_toggle',
                ]),
            });
    }
}
