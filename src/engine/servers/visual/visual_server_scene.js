import { List } from 'engine/core/self_list';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Transform } from 'engine/core/math/transform';
import { CameraMatrix } from 'engine/core/math/camera_matrix';
import { Octree } from 'engine/core/math/octree';

import {
    INSTANCE_TYPE_NONE,
    INSTANCE_TYPE_MESH,
    INSTANCE_TYPE_LIGHT,
    INSTANCE_TYPE_MULTIMESH,
    INSTANCE_TYPE_IMMEDIATE,
    INSTANCE_TYPE_PARTICLES,
    INSTANCE_TYPE_REFLECTION_PROBE,
    INSTANCE_TYPE_LIGHTMAP_CAPTURE,
    INSTANCE_TYPE_GI_PROBE,
} from '../visual_server';

export const CAMERA_PERSPECTIVE = 0;
export const CAMERA_ORTHOGONAL = 1;
export const CAMERA_FRUSTUM = 2;

export class Camera_t {
    get class() { return "Camera_t" }

    constructor() {
        this.type = CAMERA_PERSPECTIVE;
        this.fov = 70.0;
        this.znear = 0.05;
        this.zfar = 100.0;
        this.size = 1.0;
        this.offset = new Vector2;
        this.visible_layers = 0xFFFFFFFF;
        this.vaspect = false;
        this.env = null;

        this.transform = new Transform;
    }
}

export class Scenario_t {
    get class() { return "Scenario_t" }

    constructor() {
        this.octree = new Octree;

        this.environment = null;
        /** @type {List<Instance>} */
        this.instances = new List;
    }
}

class InstanceBaseData { }

export class Instance {
    get class() { return "Instance" }

    constructor() {
        this.base_type = INSTANCE_TYPE_NONE;
        /** @type {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} */
        this.base = null;

        this.skeleton = null;
        this.materail_override = null;

        this.transform = new Transform;

        this.depth_layer = 0;
        this.layer_mask = 1;

        this.materials = [];
        this.light_instances = [];
        this.reflection_probe_instances = [];
        this.gi_probe_instances = [];

        /** @type {number[]} */
        this.blend_values = [];

        this.cast_shadows = 0;

        this.depth = 0;

        this.octree_id = null;
        this.scenario = null;

        /** @type {InstanceBaseData} */
        this.base_data = null;
    }
}


class InstanceGeometryData extends InstanceBaseData {
    get class() { return "InstanceGeometryData" }

    constructor() {
        super();

        this.lighting = [];
        this.lighting_dirty = false;
        this.can_cast_shadows = true;
        this.material_is_animated = true;

        this.reflection_probes = [];
        this.reflection_dirty = true;

        this.gi_probes = [];
        this.gi_probes_dirty = true;

        this.lightmap_captures = [];
    }
}

export class VisualServerScene {
    constructor() {
        this.render_pass = 0;
    }

    camera_create() {
        return new Camera_t;
    }

    /**
     * @param {Camera_t} camera
     * @param {number} fov_degrees
     * @param {number} z_near
     * @param {number} z_far
     */
    camera_set_perspective(camera, fov_degrees, z_near, z_far) {
        camera.type = CAMERA_PERSPECTIVE;
        camera.fov = fov_degrees;
        camera.znear = z_near;
        camera.zfar = z_far;
    }

    /**
     * @param {Camera_t} camera
     * @param {number} size
     * @param {number} z_near
     * @param {number} z_far
     */
    camera_set_orthogonal(camera, size, z_near, z_far) {
        camera.type = CAMERA_ORTHOGONAL;
        camera.size = size;
        camera.znear = z_near;
        camera.zfar = z_far;
    }

    /**
     * @param {Camera_t} camera
     * @param {number} size
     * @param {Vector2Like} offset
     * @param {number} z_near
     * @param {number} z_far
     */
    camera_set_frustum(camera, size, offset, z_near, z_far) {
        camera.type = CAMERA_FRUSTUM;
        camera.size = size;
        camera.offset.copy(offset);
        camera.znear = z_near;
        camera.zfar = z_far;
    }

    /**
     * @param {Camera_t} camera
     * @param {Transform} transform
     */
    camera_set_transform(camera, transform) {
        camera.transform = transform.orthonormalized();
    }

    /**
     * @param {Camera_t} camera
     * @param {number} layers
     */
    camera_set_cull_mask(camera, layers) {
        camera.visible_layers = layers;
    }

    /**
     * @param {Camera_t} camera
     * @param {number} env
     */
    camera_set_environment(camera, env) {
        camera.env = env;
    }

    /**
     * @param {Camera_t} camera
     * @param {boolean} enable
     */
    camera_set_use_vertical_aspect(camera, enable) {
        camera.vaspect = enable;
    }

    scenario_create() {
        return new Scenario_t;
    }

    /**
     * @param {Camera_t} camera
     * @param {Scenario_t} scenario
     * @param {Vector2Like} viewport_size
     */
    render_camera(camera, scenario, viewport_size) {
        let camera_matrix = new CameraMatrix;
        let ortho = false;

        switch (camera.type) {
            case CAMERA_ORTHOGONAL: {
                camera_matrix.set_orthogonal(
                    camera.size,
                    viewport_size.x / viewport_size.y,
                    camera.znear,
                    camera.zfar,
                    camera.vaspect
                );
                ortho = true;
            } break;
            case CAMERA_PERSPECTIVE: {
                camera_matrix.set_perspective(
                    camera.fov,
                    viewport_size.x / viewport_size.y,
                    camera.znear,
                    camera.zfar,
                    camera.vaspect
                );
                ortho = false;
            } break;
            case CAMERA_FRUSTUM: {
                camera_matrix.set_frustum(
                    camera.size,
                    viewport_size.x / viewport_size.y,
                    camera.offset,
                    camera.znear,
                    camera.zfar,
                    camera.vaspect
                );
                ortho = false;
            } break;
        }

        this._prepare_scene(camera.transform, camera_matrix, ortho, camera.env, camera.visible_layers, scenario);
        this._render_scene(camera.transform, camera_matrix, ortho, camera.env, scenario);
    }

    render_dirty_instances() { }

    free_rid(rid) {
        return false;
    }

    instance_create() {
        return new Instance;
    }

    /**
     * @param {Instance} p_instance
     * @param {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} p_base
     */
    instance_set_base(p_instance, p_base) {
        if (p_instance.base_type !== INSTANCE_TYPE_NONE) {
            if (p_instance.scenario && p_instance.octree_id) {
                p_instance.scenario.octree.erase(p_instance.octree_id);
                p_instance.octree_id = 0;
            }

            p_instance.blend_values.length = 0;
            p_instance.materials.length = 0;
        }

        p_instance.base_type = INSTANCE_TYPE_NONE;
        p_instance.base = null;

        if (p_base) {
            // TODO: fetch real type instead of hard coded mesh
            p_instance.base_type = INSTANCE_TYPE_MESH;

            switch (p_instance.base_type) {
                case INSTANCE_TYPE_LIGHT: { } break;
                case INSTANCE_TYPE_MESH:
                case INSTANCE_TYPE_MULTIMESH:
                case INSTANCE_TYPE_IMMEDIATE:
                case INSTANCE_TYPE_PARTICLES: {
                    let geom = new InstanceGeometryData;
                    p_instance.base_data = geom;
                    // if (p_instance.base_type === INSTANCE_TYPE_MESH) {
                    //     p_instance.blend_values.length = VSG.storage.mesh_get_blend_shape_count(p_base);
                    // }
                } break;
                case INSTANCE_TYPE_REFLECTION_PROBE: { } break;
                case INSTANCE_TYPE_LIGHTMAP_CAPTURE: { } break;
                case INSTANCE_TYPE_GI_PROBE: { } break;
            }
        }
    }

    /**
     * @param {Transform} p_cam_transform
     * @param {CameraMatrix} p_cam_projection
     * @param {boolean} p_cam_ortho
     * @param {any} p_force_env
     * @param {number} p_visible_layers
     * @param {Scenario_t} p_scenario
     */
    _prepare_scene(p_cam_transform, p_cam_projection, p_cam_ortho, p_force_env, p_visible_layers, p_scenario) { }

    /**
     * @param {Transform} p_cam_transform
     * @param {CameraMatrix} p_cam_projection
     * @param {boolean} p_cam_ortho
     * @param {any} p_force_env
     * @param {Scenario_t} p_scenario
     */
    _render_scene(p_cam_transform, p_cam_projection, p_cam_ortho, p_force_env, p_scenario) { }
}
