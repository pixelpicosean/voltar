import { CharacterMap, Animation, Folder, Spatial, Obj } from './Model';
import Sprite from '../sprites/Sprite';

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

export class ObjectProvider {
    constructor() {
        /**
         * @type {Array<Spatial>}
         */
        this.spatial_pool = [];
        /**
         * @type {Array<Obj>}
         */
        this.obj_pool = [];
        /**
         * @type {Array<Sprite>}
         */
        this.spr_pool = [];
    }
    put_spatial(spatial) {
        this.obj_pool.push(spatial);
    }
    get_spatial(data) {
        let spatial = this.spatial_pool.pop();
        if (!spatial) {
            spatial = new Spatial();
        }
        return spatial.init(data);
    }
    put_obj(obj) {
        this.obj_pool.push(obj);
    }
    get_obj(data) {
        let obj = this.obj_pool.pop();
        if (!obj) {
            obj = new Obj();
        }
        return obj.init(data);
    }

    put_spr(spr) {
        this.spr_pool.push(spr);
    }
    get_spr() {
        let spr = this.spr_pool.pop();
        if (!spr) {
            spr = new Sprite(undefined);
        }
        return spr;
    }
}

export const object_provider = new ObjectProvider();
