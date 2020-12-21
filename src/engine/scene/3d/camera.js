import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3.js";
import { Transform } from "engine/core/math/transform.js";

import { VSG } from "engine/servers/visual/visual_server_globals.js";

import {
    Spatial,
    NOTIFICATION_ENTER_WORLD,
    NOTIFICATION_EXIT_WORLD,
    NOTIFICATION_LOCAL_TRANSFORM_CHANGED_3D,
} from "./spatial.js";
import { NOTIFICATION_TRANSFORM_CHANGED } from "../const";

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

        this.viewport = null;
        /** @type {import('engine/servers/visual/visual_server_scene').Scenario_t} */
        this.scenario_id = null;
        this.environment = 0;

        this.camera = VSG.scene.camera_create();

        this.size = 1;
        this.fov = 0;
        this.frustum_offset = new Vector2;
        this.near = 0;
        this.far = 0;

        this.current = false;

        this.force_change = false;

        this.mode = PROJECTION_PERSPECTIVE;
        this.set_perspective(70.0, 0.05, 100.0);

        this.keep_aspect = KEEP_ASPECT_HEIGHT;

        this.layers = 0xFFFFF;

        this.v_offset = 0;
        this.h_offset = 0;

        VSG.scene.camera_set_cull_mask(this.camera, this.layers);

        this.set_notify_transform(true);
        this.set_disable_scale(true);
    }

    /**
     * @param {boolean} p_enabled
     */
    set_disable_scale(p_enabled) {
        this.d_data.disable_scale = p_enabled;
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

        this.fov = fov_degrees;
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
    set_orthogonal(size, z_near, z_far) {
        if (!this.force_change && this.size === size && this.near === z_near && this.far === z_far && this.mode === PROJECTION_ORTHOGONAL) {
            return;
        }

        this.size = size;

        this.near = z_near;
        this.far = z_far;
        this.mode = PROJECTION_ORTHOGONAL;

        VSG.scene.camera_set_orthogonal(this.camera, this.size, this.near, this.far);
        this.force_change = false;
    }

    /**
     * @param {number} size
     * @param {Vector2Like} offset
     * @param {number} z_near
     * @param {number} z_far
     */
    set_frustum(size, offset, z_near, z_far) {
        if (!this.force_change && this.size === size && this.frustum_offset.equals(offset) && this.near === z_near && this.far === z_far && this.mode === PROJECTION_FRUSTUM) {
            return;
        }

        this.size = size;
        this.frustum_offset.copy(offset);

        this.near = z_near;
        this.far = z_far;
        this.mode = PROJECTION_FRUSTUM;

        VSG.scene.camera_set_frustum(this.camera, this.size, this.frustum_offset, this.near, this.far);
        this.force_change = false;
    }

    /**
     * @param {number} p_mode
     */
    set_projection(p_mode) {
        if (p_mode === PROJECTION_PERSPECTIVE || p_mode === PROJECTION_ORTHOGONAL || p_mode === PROJECTION_FRUSTUM) {
            this.mode = p_mode;
            this._update_camera_mode();
        }
    }

    make_current() {
        this.current = true;

        if (!this.is_inside_tree()) return;

        this.get_viewport()._camera_set(this);
    }
    clear_current(enable_next = true) {
        this.current = false;
        if (!this.is_inside_tree()) return;

        if (this.get_viewport().camera === this) {
            this.get_viewport()._camera_set(null);

            if (enable_next) {
                this.get_viewport()._camera_make_next_current(this);
            }
        }
    }
    /**
     * @param {boolean} current
     */
    set_current(current) {
        if (current) {
            this.make_current();
        } else {
            this.clear_current();
        }
    }

    /**
     * @returns new Transform
     */
    get_camera_transform() {
        let tr = this.get_global_transform().clone().orthonormalize();
        let v = tr.basis.get_axis(1).scale(this.v_offset);
        let h = tr.basis.get_axis(0).scale(this.h_offset);
        tr.origin.add(v).add(h);
        Vector3.free(v);
        Vector3.free(h);
        return tr;
    }

    /**
     * @param {number} p_fov
     */
    set_fov(p_fov) {
        this.fov = p_fov;
        this._update_camera_mode();
    }

    /**
     * @param {number} p_znear
     */
    set_near(p_znear) {
        this.near = p_znear;
        this._update_camera_mode();
    }

    /**
     * @param {number} p_zfar
     */
    set_far(p_zfar) {
        this.far = p_zfar;
        this._update_camera_mode();
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_frustum_offset(p_offset) {
        this.frustum_offset.copy(p_offset);
        this._update_camera_mode();
    }

    /**
     * @param {number} p_size
     */
    set_size(p_size) {
        this.size = p_size;
        this._update_camera_mode();
    }

    /* virtual methods */

    free() {
        VSG.scene.free_rid(this.camera);
        return super.free();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.projection !== undefined) this.set_projection(data.projection);
        if (data.fov !== undefined) this.set_fov(data.fov);
        if (data.size !== undefined) this.set_size(data.size);

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
            case NOTIFICATION_TRANSFORM_CHANGED: {
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

    _update_camera_mode() {
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

    _update_camera() {
        if (!this.is_inside_tree()) return;

        let transform = this.get_camera_transform();
        VSG.scene.camera_set_transform(this.camera, transform);
        Transform.free(transform);

        if (!this.current) return;

        this.get_viewport()._camera_transform_changed_notify();

        let world = this.get_world();
        if (world) {
            world._update_camera(this);
        }
    }
}

node_class_map["Camera"] = GDCLASS(Camera, Spatial)
