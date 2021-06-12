import { VObject } from "engine/core/v_object";
import { VSG } from "engine/servers/visual/visual_server_globals";

type Environment_t = import("engine/drivers/webgl/rasterizer_scene").Environment_t;

export class World extends VObject {
    get class() { return "World" }

    // @Incomplete: physics
    space: any = null;
    scenario = VSG.scene.scenario_create();

    // @Incomplete: physics
    indexer: any = null;
    environment: Environment_t = null;
    fallback_environment: Environment_t = null;

    _free() {
        VSG.scene.scenario_free(this.scenario);
        this.scenario = null;

        super._free();
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
    set_environment(p_environment: Environment_t) {
        if (this.environment === p_environment) return;

        this.environment = p_environment;
        this.scenario.environment = p_environment;
    }

    /**
     * @param {Environment_t} p_environment
     */
    set_fallback_environment(p_environment: Environment_t) {
        if (this.fallback_environment === p_environment) return;

        this.fallback_environment = p_environment;
        this.scenario.fallback_environment = this.fallback_environment;
    }

    /**
     * @param {import('engine/scene/3d/camera').Camera} p_camera
     */
    _register_camera(p_camera: import('engine/scene/3d/camera').Camera) { }

    /**
     * @param {import('engine/scene/3d/camera').Camera} p_camera
     */
    _update_camera(p_camera: import('engine/scene/3d/camera').Camera) { }

    /**
     * @param {import('engine/scene/3d/camera').Camera} p_camera
     */
    _remove_camera(p_camera: import('engine/scene/3d/camera').Camera) { }

    /**
     * @param {number} p_frame
     */
    _update(p_frame: number) { }
}
