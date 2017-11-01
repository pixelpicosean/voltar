import { CharacterMap, Animation } from './Model';
import { FrameDataCalculator } from './FrameData';

export class TextureProvider {
    constructor() {
        /**
         * @type {CharacterMap}
         */
        this.character_map = null;
        this.texture_tabel = {};
    }
    /**
     * Get texture with folder and file name
     * @param {number} folder
     * @param {number} file
     * @returns {string}
     */
    get(folder, file) {
        return this.texture_tabel[folder][file];
    }
    /**
     * Set texture
     * @param {number} folder
     * @param {number} file
     * @param {string} texture
     */
    set(folder, file, texture) {
        let folder_tabel = this.texture_tabel[folder];
        if (!folder_tabel) {
            this.texture_tabel[folder] = folder_tabel = {};
        }
        folder_tabel[file] = texture;
    }
}

export class FrameDataProvider {
    constructor() {
        this.calculator = new FrameDataCalculator();
    }
    /**
     * @param {number} time 
     * @param {number} delta
     * @param {number} factor
     * @param {Animation} first 
     * @param {Animation} [second] 
     */
    get_frame_data(time, delta, factor, first, second = null) {
        return (!second) ? this.calculator.get_frame_data(first, time, delta) : this.calculator.get_frame_data(first, second, time, delta, factor);
    }
}
