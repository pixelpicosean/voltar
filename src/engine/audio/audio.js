import { Howler, Howl } from "./howler";

/**
 * @typedef PlayingState
 * @property {Howl} sound
 * @property {number} id
 * @property {number} volumn
 *
 * @typedef AudioLoadConfig
 * @property {number} [volume]
 * @property {boolean} [loop]
 * @property {boolean} [preload]
 * @property {boolean} [autoplay]
 * @property {{ [k: string]: { start: number, end: number, loop: boolean } }} [sprite]
 */

export class AudioServer {
    static get_singleton() { return singleton }

    constructor() {
        if (!singleton) singleton = this;

        /** @type {Map<string, Howl>} */
        this.storage = new Map;
        /** @type {PlayingState[]} */
        this.sounds_on_playing = [];
        /** @type {PlayingState[]} */
        this.musics_on_playing = [];

        this.sound_volume = 1;
        this.music_volume = 1;

        this.sound_muted = false;
        this.music_muted = false;
    }

    /**
     * @param {number} volume
     */
    set_sound_volume(volume) {
        this.sound_volume = volume;
        for (let i = 0; i < this.sounds_on_playing.length; i++) {
            const s = this.sounds_on_playing[i];
            s.sound.volume(s.volumn * volume, s.id);
        }
    }
    /**
     * @param {number} volume
     */
    set_music_volume(volume) {
        this.music_volume = volume;
        for (let i = 0; i < this.musics_on_playing.length; i++) {
            const s = this.musics_on_playing[i];
            s.sound.volume(s.volumn * volume, s.id);
        }
    }

    /**
     * @param {boolean} muted
     */
    toggle_sound(muted) {
        this.sound_muted = muted;
        for (let i = 0; i < this.sounds_on_playing.length; i++) {
            const s = this.sounds_on_playing[i];
            s.sound.mute(muted, s.id);
        }
    }
    /**
     * @param {boolean} muted
     */
    toggle_music(muted) {
        this.music_muted = muted;
        for (let i = 0; i < this.musics_on_playing.length; i++) {
            const s = this.musics_on_playing[i];
            s.sound.mute(muted, s.id);
        }
    }

    /**
     * @param {string} key
     * @param {string|string[]} url
     * @param {AudioLoadConfig} [config]
     */
    load(key, url, config) {
        const sound = new Howl(Object.assign({
            src: Array.isArray(url) ? url : [url],
            onloaderror: () => {
                console.warn(`Failed to load audio from "${url}"`)
            },
        }, config));
        this.storage.set(key, sound);
    }

    /**
     * @param {string} key
     * @param {number} [id]
     */
    get_length(key, id) {
        const sound = this.storage.get(key);
        if (!sound) return 0;
        return sound.duration(id);
    }
    /**
     * @param {string} key
     * @param {number} [id]
     */
    is_playing(key, id) {
        const sound = this.storage.get(key);
        if (!sound) return false;
        return sound.playing(id);
    }

    /**
     * @param {string} key
     * @param {number} [volume]
     * @param {string} [sprite]
     * @returns {number} return id of the playing sound
     */
    play_sound(key, volume, sprite) {
        const sound = this.storage.get(key);
        if (!sound) return -1;
        const id = sound.play(sprite);
        this.sounds_on_playing.push({
            sound: sound,
            volumn: volume,
            id: id,
        })
        return id;
    }

    /**
     * @param {string} key
     * @param {number} [id]
     */
    stop_sound(key, id) {
        const sound = this.storage.get(key);
        if (!sound) return;

        for (let i = 0; i < this.sounds_on_playing.length; i++) {
            const s = this.sounds_on_playing[i];
            if (s.sound === sound && s.id === id) {
                this.sounds_on_playing.splice(i, 1);
                break;
            }
        }

        return sound.stop(id);
    }

    /**
     * @param {string} key
     * @param {number} [volume]
     * @param {boolean} [loop]
     */
    play_music(key, volume = 1.0, loop = true) {
        const sound = this.storage.get(key);
        if (!sound) return -1;
        const id = sound.play();
        sound.loop(loop, id);
        this.musics_on_playing.push({
            sound: sound,
            volumn: volume,
            id: id,
        })
        return id;
    }
    /**
     * @param {string} key
     * @param {number} [id]
     */
    stop_music(key, id) {
        const sound = this.storage.get(key);
        if (!sound) return;

        for (let i = 0; i < this.musics_on_playing.length; i++) {
            const s = this.musics_on_playing[i];
            if (s.sound === sound && s.id === id) {
                this.musics_on_playing.splice(i, 1);
                break;
            }
        }

        return sound.stop(id);
    }

    /**
     * @param {string} key
     * @param {boolean} loop
     * @param {number} [id]
     */
    loop(key, loop, id) {
        const sound = this.storage.get(key);
        if (!sound) return;

        sound.loop(loop, id);
    }

    /**
     * @param {string} key
     * @param {number} from
     * @param {number} to
     * @param {number} duration
     * @param {number} [id]
     */
    fade(key, from, to, duration, id) {
        const sound = this.storage.get(key);
        if (!sound) return;

        sound.fade(from, to, duration, id);
    }
}

/** @type {AudioServer} */
let singleton = null;
