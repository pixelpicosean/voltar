import SoundLibrary from "../SoundLibrary";
import Sound from "../Sound";
import WebAudioMedia from "../webaudio/WebAudioMedia";
/**
 * Utilities that work with sounds.
 * @namespace PIXI.sound.utils
 */
export default class SoundUtils {
    /**
     * Create a new sound for a sine wave-based tone.  **Only supported with WebAudio**
     * @method PIXI.sound.utils.sineTone
     * @param {Number} [hertz=200] Frequency of sound.
     * @param {Number} [seconds=1] Duration of sound in seconds.
     * @return {PIXI.sound.Sound} New sound.
     */
    static sineTone(hertz = 200, seconds = 1) {
        const sound = Sound.from({
            singleInstance: true,
        });
        if (!(sound.media instanceof WebAudioMedia)) {
            return sound;
        }
        const media = sound.media;
        const context = sound.context;
        // set default value
        const nChannels = 1;
        const sampleRate = 48000;
        const amplitude = 2;
        // create the buffer
        const buffer = context.audioContext.createBuffer(nChannels, seconds * sampleRate, sampleRate);
        const fArray = buffer.getChannelData(0);
        // fill the buffer
        for (let i = 0; i < fArray.length; i++) {
            const time = i / buffer.sampleRate;
            const angle = hertz * time * Math.PI;
            fArray[i] = Math.sin(angle) * amplitude;
        }
        // set the buffer
        media.buffer = buffer;
        sound.isLoaded = true;
        return sound;
    }
    /**
     * Render image as Texture. **Only supported with WebAudio**
     * @method PIXI.sound.utils.render
     * @param {PIXI.sound.Sound} sound Instance of sound to render
     * @param {Object} [options] Custom rendering options
     * @param {Number} [options.width=512] Width of the render
     * @param {Number} [options.height=128] Height of the render
     * @param {string|CanvasPattern|CanvasGradient} [options.fill='black'] Fill style for waveform
     * @return {PIXI.Texture} Result texture
     */
    static render(sound, options) {
        const canvas = document.createElement("canvas");
        options = Object.assign({
            width: 512,
            height: 128,
            fill: "black",
        }, options || {});
        canvas.width = options.width;
        canvas.height = options.height;
        const baseTexture = PIXI.BaseTexture.fromCanvas(canvas);
        if (!(sound.media instanceof WebAudioMedia)) {
            return baseTexture;
        }
        const media = sound.media;
        console.assert(!!media.buffer, "No buffer found, load first");
        const context = canvas.getContext("2d");
        context.fillStyle = options.fill;
        const data = media.buffer.getChannelData(0);
        const step = Math.ceil(data.length / options.width);
        const amp = options.height / 2;
        for (let i = 0; i < options.width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) {
                    min = datum;
                }
                if (datum > max) {
                    max = datum;
                }
            }
            context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
        return baseTexture;
    }
    /**
     * Create a new "Audio" stream based on given audio path and project uri; returns the audio object.
     * @method PIXI.sound.utils.playOnce
     * @static
     * @param {String} fileName Full path of the file to play.
     * @param {Function} callback Callback when complete.
     * @return {string} New audio element alias.
     */
    static playOnce(url, callback) {
        const alias = `alias${SoundUtils.PLAY_ID++}`;
        SoundLibrary.instance.add(alias, {
            url,
            preload: true,
            autoPlay: true,
            loaded: (err) => {
                if (err) {
                    console.error(err);
                    SoundLibrary.instance.remove(alias);
                    if (callback) {
                        callback(err);
                    }
                }
            },
            complete: () => {
                SoundLibrary.instance.remove(alias);
                if (callback) {
                    callback(null);
                }
            },
        });
        return alias;
    }
}
/**
 * Increment the alias for play once
 * @static
 * @private
 * @default 0
 */
SoundUtils.PLAY_ID = 0;
