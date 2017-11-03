import { CharacterMap, Animation, Folder } from './Model';
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
     * @param {Array<Folder>} folders 
     */
    load(folders) {
        let folder_map = null;
        for (let folder of folders) {
            folder_map = this.texture_tabel[folder.id];
            if (!folder_map) {
                folder_map = this.texture_tabel[folder.id] = {};
            }

            for (let file of folder.file) {
                folder_map[file.id] = file.name;
            }
        }
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
