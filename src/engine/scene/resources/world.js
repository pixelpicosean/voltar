import { VSG } from 'engine/servers/visual/visual_server_globals';

export class World {
    get class() { return "World" }

    constructor() {
        this.space = null;
        this.scenario = VSG.scene.scenario_create();

        this.indexer = null;
        this.environment = null;
        this.fallback_environment = null;
    }

    free() {
        VSG.scene.free_rid(this.scenario);
        this.scenario = null;
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
