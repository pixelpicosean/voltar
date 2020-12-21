import { VObject } from 'engine/core/v_object';
import { VSG } from 'engine/servers/visual/visual_server_globals.js';

/**
 * @typedef {import('engine/drivers/webgl/rasterizer_scene').Environment_t} Environment_t
 */

export class World extends VObject {
    get class() { return "World" }

    constructor() {
        super();

        this.space = null;
        this.scenario = VSG.scene.scenario_create();

        this.indexer = null;
        /** @type {Environment_t} */
        this.environment = null;
        /** @type {Environment_t} */
        this.fallback_environment = null;
    }

    free() {
        VSG.scene.free_rid(this.scenario);
        this.scenario = null;

        return super.free();
    }

    duplicate() {
        let new_world = new World;

        new_world.space = this.space;
        new_world.scenario = this.scenario;

        new_world.indexer = this.indexer;
        new_world.environment = this.environment;
        new_world.fallback_environment = this.fallback_environment;

        return new_world;
    }

    /**
     * @param {Environment_t} p_environment
     */
    set_fallback_environment(p_environment) {
        if (this.fallback_environment === p_environment) return;

        this.fallback_environment = p_environment;
        this.scenario.fallback_environment = this.fallback_environment;
    }

    /**
     * @param {import('engine/scene/3d/camera').Camera} p_camera
     */
    _register_camera(p_camera) { }

    /**
     * @param {import('engine/scene/3d/camera').Camera} p_camera
     */
    _update_camera(p_camera) { }

    /**
     * @param {import('engine/scene/3d/camera').Camera} p_camera
     */
    _remove_camera(p_camera) { }

    /**
     * @param {number} p_frame
     */
    _update(p_frame) { }
}
