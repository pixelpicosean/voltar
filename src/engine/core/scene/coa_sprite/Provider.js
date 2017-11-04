import { CharacterMap, Animation, Folder, Spatial, Obj } from './Model';
import Sprite from '../sprites/Sprite';

/**
 * @typedef SpriteInfo
 * @type {string} texture
 * @type {number} pivot_x
 * @type {number} pivot_y
 */

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
                folder_map[file.id] = {
                    texture: file.name,
                    pivot_x: file.pivot_x,
                    pivot_y: file.pivot_y,
                };
            }
        }
    }
    /**
     * Get texture with folder and file name
     * @param {number} folder
     * @param {number} file
     * @returns {SpriteInfo}
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
        this.sprite_pool = [];

        this.spatial_count = 0;
        this.obj_count = 0;
        this.sprite_count = 0;
    }
    put_spatial(spatial) {
        this.spatial_pool.push(spatial);
    }
    get_spatial(data) {
        let spatial = this.spatial_pool.pop();
        if (!spatial) {
            spatial = new Spatial();
            this.spatial_count++;
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
            this.obj_count++;
        }
        return obj.init(data);
    }

    put_sprite(spr) {
        this.sprite_pool.push(spr);
    }
    get_sprite() {
        let spr = this.sprite_pool.pop();
        if (!spr) {
            spr = new Sprite(undefined);
            this.sprite_count++;
        }
        return spr;
    }

    // Debug
    log() {
        console.log(`spatial: ${this.spatial_count}, obj: ${this.obj_count}, sprite: ${this.sprite_count}`)
    }
}

export const object_provider = new ObjectProvider();
