import Resource from "engine/core/io/Resource";
import BaseTexture from "engine/scene/resources/textures/base_texture";
import SoundLibrary from "../SoundLibrary";
import Sound from "../Sound";
import WebAudioMedia from "../webaudio/WebAudioMedia";

/**
 * @typedef RenderOptions
 * @property {number} [width]
 * @property {number} [height]
 * @property {string|CanvasPattern|CanvasGradient} [fill]
 */

/**
 * @typedef {{ [key: string]: boolean }} ExtensionMap
 */

/**
 * Utilities that work with sounds.
 */
export default class SoundUtils {
    /**
     * The list of browser supported audio formats.
     * @static
     * @returns {ExtensionMap}
     */
    static supported() {
        const types = {
            m4a: 'mp4',
            oga: 'ogg',
        };
        const audio = document.createElement('audio');
        /** @type {ExtensionMap} */
        const formats = {};
        const no = /^no$/;
        SoundUtils.extensions.forEach(ext => {
            const type = types[ext] || ext;
            const canByExt = audio.canPlayType(`audio/${ext}`).replace(no, '');
            const canByType = audio.canPlayType(`audio/${type}`).replace(no, '');
            formats[ext] = !!canByExt || !!canByType;
        });

        return Object.freeze(formats);
    }
    /**
     * Resolve a URL with different formats in glob pattern to
     * a path based on the supported browser format. For instance:
     * "sounds/music.{ogg,mp3}", would resolve to "sounds/music.ogg"
     * if "ogg" support is found, otherwise, fallback to "sounds.music.mp3"
     * @static
     * @param {string|Resource} source Path to resolve or Resource, if
     *                                 a Resource object is provided, automatically updates the extension and url
     *        of that object.
     * @return {string} The format to resolve to
     */
    static resolveUrl(source) {
        // search for patterns like ".{mp3,ogg}""
        const glob = SoundUtils.FORMAT_PATTERN;
        const url = typeof source === 'string' ? source : source.url;
        if (!glob.test(url)) {
            return url;
        } else {
            const match = glob.exec(url);
            const exts = match[2].split(',');
            let replace = exts[exts.length - 1]; // fallback to last ext
            for (let i = 0, len = exts.length; i < len; i++) {
                const ext = exts[i];
                if (SoundUtils.supported[ext]) {
                    replace = ext;
                    break;
                }
            }
            const resolved = url.replace(match[1], replace);
            if (!(typeof source === 'string')) {
                source.extension = replace;
                source.url = resolved;
            }
            return resolved;
        }
    }
    /**
     * Create a new sound for a sine wave-based tone.  **Only supported with WebAudio**
     * @param {number} [hertz=200] Frequency of sound.
     * @param {number} [seconds=1] Duration of sound in seconds.
     * @return {Sound} New sound.
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
     * @param {Sound} sound Instance of sound to render
     * @param {Object} [options] Custom rendering options
     * @param {number} [options.width=512] Width of the render
     * @param {number} [options.height=128] Height of the render
     * @param {string|CanvasPattern|CanvasGradient} [options.fill='black'] Fill style for waveform
     * @return {BaseTexture} Result texture
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

        const baseTexture = BaseTexture.from_canvas(canvas);

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
     * @static
     * @param {String} url Full path of the file to play.
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

/**
 * RegExp for looking for format patterns.
 * @static
 * @private
 */
SoundUtils.FORMAT_PATTERN = /\.(\{([^\}]+)\})(\?.*)?$/;

/**
 * The list of extensions that can be played.
 * @readonly
 * @static
 */
SoundUtils.extensions = [
    "mp3",
    "ogg",
    "oga",
    "opus",
    "mpeg",
    "wav",
    "m4a",
    "mp4",
    "aiff",
    "wma",
    "mid"
];
