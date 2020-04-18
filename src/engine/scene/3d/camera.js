import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";

import { Spatial, NOTIFICATION_ENTER_WORLD, NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D, NOTIFICATION_EXIT_WORLD } from "./spatial";
import { VSG } from "engine/servers/visual/visual_server_globals";

export const PROJECTION_PERSPECTIVE = 0;
export const PROJECTION_ORTHOGONAL = 1;
export const PROJECTION_FRUSTUM = 2;

export const KEEP_ASPECT_WIDTH = 0;
export const KEEP_ASPECT_HEIGHT = 1;

export const NOTIFICATION_BECAME_CURRENT = 50;
export const NOTIFICATION_LOST_CURRENT = 51;

export class Camera extends Spatial {
    get class() { return "Camera" }

    constructor() {
        super();

        this.force_change = false;
        this.current = false;

        this.viewport = null;

        this.mode = PROJECTION_PERSPECTIVE;

        this.fov = 0;
        this.size = 1;
        this.frustum_offset = new Vector2;
        this.near = 0;
        this.far = 0;

        this.v_offset = 0;
        this.h_offset = 0;
        this.keep_aspect = KEEP_ASPECT_HEIGHT;

        this.camera = VSG.scene.camera_create();
        /** @type {import('engine/servers/visual/visual_server_scene').Scenario_t} */
        this.scenario_id = null;

        this.set_perspective(70, 0.05, 100);

        this.layers = 0xFFFFF;
        VSG.scene.camera_set_cull_mask(this.camera, this.layers);

        this.environment = 0;
    }

    /**
     * @param {number} fov_degrees
     * @param {number} z_near
     * @param {number} z_far
     */
    set_perspective(fov_degrees, z_near, z_far) {
        if (!this.force_change && this.fov === fov_degrees && this.near === z_near && this.far === z_far && this.mode === PROJECTION_PERSPECTIVE) {
            return;
        }

        this.fov = this.fov;
        this.near = z_near;
        this.far = z_far;
        this.mode = PROJECTION_PERSPECTIVE;

        VSG.scene.camera_set_perspective(this.camera, this.fov, this.near, this.far);
        this.force_change = false;
    }

    /**
     * @param {number} size
     * @param {number} z_near
     * @param {number} z_far
     */
    set_orthogonal(size, z_near, z_far) { }

    /**
     * @param {number} size
     * @param {Vector2Like} offset
     * @param {number} z_near
     * @param {number} z_far
     */
    set_frustum(size, offset, z_near, z_far) { }

    set_projection() { }

    make_current() {
        this.current = true;

        if (!this.is_inside_tree()) return;

        this.get_viewport()._camera_set(this);
    }
    clear_current(enable_next = true) { }
    set_current(current) { }

    get_camera_transform() { }

    /* virtual methods */

    free() {
        VSG.scene.free_rid(this.camera);
        return super.free();
    }

    _load_data(data) {
        super._load_data(data);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_WORLD: {
                this.viewport = this.get_viewport();

                let first_camera = this.viewport._camera_add(this);
                if (this.current || first_camera) {
                    this.viewport._camera_set(this);
                }
            } break;
            case NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D: {
                this._request_camera_update();
            } break;
            case NOTIFICATION_EXIT_WORLD: {
                if (this.viewport) {
                    this.viewport._camera_remove(this);
                    this.viewport = null;
                }
            } break;
            case NOTIFICATION_BECAME_CURRENT: {
                if (this.viewport) {
                    this.viewport.find_world()._register_camera(this);
                }
            } break;
            case NOTIFICATION_LOST_CURRENT: {
                if (this.viewport) {
                    this.viewport.find_world()._remove_camera(this);
                }
            } break;
        }
    }

    _request_camera_update() {
        this._update_camera();
    }

    _update_camera() {
        this.force_change = true;
        switch (this.mode) {
            case PROJECTION_PERSPECTIVE: {
                this.set_perspective(this.fov, this.near, this.far);
            } break;
            case PROJECTION_ORTHOGONAL: {
                this.set_orthogonal(this.size, this.near, this.far);
            } break;
            case PROJECTION_FRUSTUM: {
                this.set_frustum(this.size, this.frustum_offset, this.near, this.far);
            } break;
        }
    }
}

node_class_map["Camera"] = GDCLASS(Camera, Spatial)
