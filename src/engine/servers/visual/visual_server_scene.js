import { List, SelfList } from 'engine/core/self_list';
import { clamp } from 'engine/core/math/math_funcs';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Vector3Like } from 'engine/core/math/vector3';
import { AABB } from 'engine/core/math/aabb';
import { Plane } from 'engine/core/math/plane';
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
    LIGHT_DIRECTIONAL,
} from '../visual_server';
import { VSG } from './visual_server_globals';

/**
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Material_t} Material_t
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Instantiable_t} Instantiable_t
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} Mesh_t
 * @typedef {import('engine/drivers/webgl/rasterizer_storage').Light_t} Light_t
 *
 * @typedef {import('engine/drivers/webgl/rasterizer_scene').LightInstance_t} LightInstance_t
 *
 * @typedef {import('engine/drivers/webgl/rasterizer_scene').Environment_t} Environment_t
 */

const MAX_INSTANCE_CULL = 65535;
const MAX_LIGHTS_CULLED = 4096;

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
        /** @type {Octree<Instance_t>} */
        this.octree = new Octree(true);

        /** @type {Instance_t[]} */
        this.directional_lights = [];

        /** @type {Environment_t} */
        this.environment = null;

        /** @type {Environment_t} */
        this.fallback_environment = null;

        /** @type {List<Instance_t>} */
        this.instances = new List;
    }
}

class InstanceBaseData { }

export class Instance_t {
    get class() { return "Instance" }

    constructor() {
        this.base_type = INSTANCE_TYPE_NONE;
        /** @type {Instantiable_t} */
        this.base = null;

        this.skeleton = null;
        /** @type {Material_t} */
        this.materail_override = null;

        this.transform = new Transform;

        this.depth_layer = 0;
        this.layer_mask = 1;

        /** @type {Material_t[]} */
        this.materials = [];
        /** @type {import('engine/drivers/webgl/rasterizer_scene').LightInstance_t[]} */
        this.light_instances = [];
        this.reflection_probe_instances = [];
        this.gi_probe_instances = [];

        /** @type {number[]} */
        this.blend_values = [];

        this.cast_shadows = 0;

        this.mirror = false;
        this.receive_shadows = true;
        this.visible = true;
        this.redraw_if_visible = false;

        this.depth = 0;

        /** @type {SelfList<Instance_t>} */
        this.dependency_item = new SelfList(this);

        this.lightmap_capture = null;
        this.lightmap = null;
        this.lightmap_capture_data = null;

        this.octree_id = 0;
        /** @type {Scenario_t} */
        this.scenario = null;
        /** @type {SelfList<Instance_t>} */
        this.scenario_item = new SelfList(this);

        this.update_aabb = false;
        this.update_materials = false;

        /** @type {SelfList<Instance_t>} */
        this.update_item = new SelfList(this);

        this.aabb = new AABB;
        this.transformed_aabb = new AABB;
        this.extra_margin = 0;
        /** @type {import('engine/scene/3d/spatial').Spatial} */
        this.object = null;

        this.last_render_pass = 0;
        this.last_frame_pass = 0;

        /** @type {InstanceBaseData} */
        this.base_data = null;

        this.version = 0;
    }

    base_removed() {
        VSG.scene.instance_set_base(this, null);
    }

    /**
     * @param {boolean} p_aabb
     * @param {boolean} p_materials
     */
    base_changed(p_aabb, p_materials) {
        VSG.scene._instance_queue_update(this, p_aabb, p_materials);
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

class InstanceLightData extends InstanceBaseData {
    constructor() {
        super();

        /** @type {LightInstance_t} */
        this.instance = null;

        /** @type {Instance_t} */
        this.D = null;

        /** @type {Instance_t[]} */
        this.geometries = [];

        this.last_version = 0;
    }
}

export class VisualServerScene {
    constructor() {
        this.render_pass = 0;

        /** @type {List<Instance_t>} */
        this._instance_update_list = new List;

        this.instance_cull_count = 0;
        /** @type {Instance_t[]} */
        this.instance_cull_result = [];
        /** @type {Instance_t[]} */
        this.light_cull_result = [];
        /** @type {LightInstance_t[]} */
        this.light_instance_cull_result = [];
        this.light_cull_count = 0;
        this.directional_light_count = 0;
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
        camera.transform.copy(transform).orthonormalize();
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
        let camera_matrix = CameraMatrix.new();
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

        CameraMatrix.free(camera_matrix);
    }

    /**
     * @param {AABB} p_aabb
     * @param {Scenario_t} p_scenario
     */
    instances_cull_aabb(p_aabb, p_scenario) { }

    /**
     * @param {Vector3Like} p_from
     * @param {Vector3Like} p_to
     * @param {Scenario_t} p_scenario
     */
    instances_cull_ray(p_from, p_to, p_scenario) { }

    /**
     * @param {Plane[]} p_convex
     * @param {Scenario_t} p_scenario
     */
    instances_cull_convex(p_convex, p_scenario) { }

    free_rid(rid) {
        return false;
    }

    instance_create() {
        return new Instance_t;
    }

    /**
     * @param {Instance_t} p_instance
     * @param {number} p_surface
     * @param {Material_t} p_material
     */
    instance_set_surface_material(p_instance, p_surface, p_material) {
        if (p_instance.base_type === INSTANCE_TYPE_MESH) {
            let mesh = /** @type {Mesh_t} */(p_instance.base);
            p_instance.materials.length = mesh.surfaces.length;
        }

        p_instance.materials[p_surface] = p_material;
        p_instance.base_changed(false, true);
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Instantiable_t} p_base
     */
    instance_set_base(p_instance, p_base) {
        let scenario = p_instance.scenario;

        if (p_instance.base_type !== INSTANCE_TYPE_NONE) {
            if (scenario && p_instance.octree_id) {
                scenario.octree.erase(p_instance.octree_id);
                p_instance.octree_id = 0;
            }

            switch (p_instance.base_type) {
                case INSTANCE_TYPE_LIGHT: {
                    let light = /** @type {InstanceLightData} */(p_instance.base_data);
                    let idx = scenario.directional_lights.indexOf(light.D);
                    if (scenario && idx >= 0) {
                        scenario.directional_lights.splice(idx, 1);
                        light.D = null;
                    }
                    light.instance = null;
                } break;
            }

            if (p_instance.base_data) {
                p_instance.base_data = null;
            }

            p_instance.blend_values.length = 0;
            p_instance.materials.length = 0;
        }

        p_instance.base_type = INSTANCE_TYPE_NONE;
        p_instance.base = null;

        if (p_base) {
            p_instance.base_type = p_base.i_type;

            switch (p_instance.base_type) {
                case INSTANCE_TYPE_LIGHT: {
                    let light_inst = /** @type {Light_t} */(p_base);
                    let light = new InstanceLightData;

                    if (scenario && light_inst.type === LIGHT_DIRECTIONAL) {
                        scenario.directional_lights.push(p_instance);
                        light.D = p_instance;
                    }

                    light.instance = VSG.scene_render.light_instance_create(light_inst);

                    p_instance.base_data = light;
                } break;
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

            VSG.storage.instance_add_dependency(p_base, p_instance);

            p_instance.base = p_base;

            if (scenario) {
                this._instance_queue_update(p_instance, true, true);
            }
        }
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Scenario_t} p_scenario
     */
    instance_set_scenario(p_instance, p_scenario) {
        if (p_instance.scenario) {
            p_instance.scenario.instances.remove(p_instance.scenario_item);

            if (p_instance.octree_id) {
                p_instance.scenario.octree.erase(p_instance.octree_id);
                p_instance.octree_id = 0;
            }

            switch (p_instance.base_type) {
                case INSTANCE_TYPE_LIGHT: {
                    let light = /** @type {InstanceLightData} */(p_instance.base_data);
                    let idx = p_instance.scenario.directional_lights.indexOf(light.D);
                    if (idx >= 0) {
                        p_instance.scenario.directional_lights.splice(idx, 1);
                        light.D = null;
                    }
                } break;
            }

            p_instance.scenario = null;
        }

        if (p_scenario) {
            p_instance.scenario = p_scenario;

            p_scenario.instances.add(p_instance.scenario_item);

            switch (p_instance.base_type) {
                case INSTANCE_TYPE_LIGHT: {
                    let light = /** @type {InstanceLightData} */(p_instance.base_data);
                    let light_inst = /** @type {Light_t} */(p_instance.base);
                    if (light_inst.type === LIGHT_DIRECTIONAL) {
                        p_scenario.directional_lights.push(p_instance);
                        light.D = p_instance;
                    }
                } break;
            }

            this._instance_queue_update(p_instance, true, true);
        }
    }

    /**
     * @param {Instance_t} p_instance
     * @param {boolean} p_visible
     */
    instance_set_visible(p_instance, p_visible) {
        if (p_instance.visible === p_visible) return;

        p_instance.visible = p_visible;

        switch (p_instance.base_type) {
            case INSTANCE_TYPE_LIGHT: {
            } break;
        }
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Transform} p_transform
     */
    instance_set_transform(p_instance, p_transform) {
        if (p_instance.transform.exact_equals(p_transform)) return;
        p_instance.transform.copy(p_transform);
        this._instance_queue_update(p_instance, true);
    }

    /**
     * @param {Instance_t} p_instance
     * @param {import('engine/scene/3d/spatial').Spatial} p_obj
     */
    instance_attach_object_instance(p_instance, p_obj) {
        p_instance.object = p_obj;
    }

    update_dirty_instances() {
        VSG.storage.update_dirty_resources();

        while (this._instance_update_list.first()) {
            this._update_dirty_instance(this._instance_update_list.first().self());
        }
    }

    /**
     * @param {Instance_t} p_instance
     */
    _update_dirty_instance(p_instance) {
        if (p_instance.update_aabb) {
            this._update_instance_aabb(p_instance);
        }

        if (p_instance.update_materials) {
            if (p_instance.base_type === INSTANCE_TYPE_MESH) {
                let new_mat_count = VSG.storage.mesh_get_surface_count(/** @type {Mesh_t} */(p_instance.base));
                p_instance.materials.length = new_mat_count;
            }
        }

        this._instance_update_list.remove(p_instance.update_item);

        this._update_instance(p_instance);

        p_instance.update_aabb = false;
        p_instance.update_materials = false;
    }

    /**
     * @param {Instance_t} p_instance
     */
    _update_instance_aabb(p_instance) {
        /** @type {AABB} */
        let new_aabb = null;
        switch (p_instance.base_type) {
            case INSTANCE_TYPE_MESH: {
                new_aabb = VSG.storage.mesh_get_aabb(/** @type {Mesh_t} */(p_instance.base));
            } break;
            case INSTANCE_TYPE_MULTIMESH: {
            } break;
            case INSTANCE_TYPE_IMMEDIATE: {
            } break;
            case INSTANCE_TYPE_PARTICLES: {
            } break;
            case INSTANCE_TYPE_LIGHT: {
                new_aabb = VSG.storage.light_get_aabb(/** @type {Light_t} */(p_instance.base));
            } break;
        }
        p_instance.aabb.copy(new_aabb);
        AABB.free(new_aabb);
    }

    /**
     * @param {Instance_t} p_instance
     */
    _update_instance(p_instance) {
        p_instance.version++;

        if (p_instance.base_type === INSTANCE_TYPE_LIGHT) {
            let light = /** @type {InstanceLightData} */(p_instance.base_data);

            VSG.scene_render.light_instance_set_transform(light.instance, p_instance.transform);
        }

        if (p_instance.aabb.has_no_surface()) return;

        p_instance.mirror = p_instance.transform.basis.determinant() < 0;

        let new_aabb = p_instance.transform.xform_aabb(p_instance.aabb);
        p_instance.transformed_aabb.copy(new_aabb);

        if (!p_instance.scenario) {
            AABB.free(new_aabb);
            return;
        }

        if (p_instance.octree_id === 0) {
            let base_type = 1 << p_instance.base_type;
            let pairable_mask = 0;
            let pairable = false;

            p_instance.octree_id = p_instance.scenario.octree.create(p_instance, new_aabb, 0, pairable, base_type, pairable_mask);
        } else {
            p_instance.scenario.octree.move(p_instance.octree_id, new_aabb);
        }

        AABB.free(new_aabb);
    }

    /**
     * @param {Instance_t} p_instance
     * @param {boolean} p_update_aabb
     * @param {boolean} [p_update_materials]
     */
    _instance_queue_update(p_instance, p_update_aabb, p_update_materials = false) {
        if (p_update_aabb) {
            p_instance.update_aabb = true;
        }
        if (p_update_materials) {
            p_instance.update_materials = true;
        }
        if (p_instance.update_item.in_list()) return;

        this._instance_update_list.add(p_instance.update_item);
    }

    /**
     * @param {Transform} p_cam_transform
     * @param {CameraMatrix} p_cam_projection
     * @param {boolean} p_cam_ortho
     * @param {import('engine/drivers/webgl/rasterizer_scene').Environment_t} p_force_env
     * @param {number} p_visible_layers
     * @param {Scenario_t} p_scenario
     */
    _prepare_scene(p_cam_transform, p_cam_projection, p_cam_ortho, p_force_env, p_visible_layers, p_scenario) {
        this.render_pass++;
        let camera_layer_mask = p_visible_layers;

        VSG.scene_render.set_scene_pass(this.render_pass);

        let planes = p_cam_projection.get_projection_planes(p_cam_transform);

        let near_plane = Plane.new().set_point_and_normal(
            p_cam_transform.origin,
            p_cam_transform.basis.get_axis(2).negate().normalize()
        );
        let z_far = p_cam_projection.get_z_far();

        this.instance_cull_count = p_scenario.octree.cull_convex(planes, this.instance_cull_result, MAX_INSTANCE_CULL);

        for (let i = 0; i < this.instance_cull_count; i++) {
            let inst = this.instance_cull_result[i];

            let keep = false;

            if ((camera_layer_mask & inst.layer_mask) === 0) {
            } else if (inst.base_type === INSTANCE_TYPE_LIGHT && inst.visible) {
                if (this.light_cull_count < MAX_LIGHTS_CULLED) {
                    let light = /** @type {InstanceLightData} */(inst.base_data);
                    if (light.geometries.length > 0) {
                        // do not add this light if no geometry is affected by it
                        this.light_cull_result[this.light_cull_count] = inst;
                        this.light_instance_cull_result[this.light_cull_count] = light.instance;

                        this.light_cull_count++;
                    }
                }
            } else if (inst.visible) {
                keep = true;

                inst.depth = near_plane.distance_to(inst.transform.origin);
                inst.depth_layer = Math.floor(clamp(inst.depth * 16 / z_far, 0, 15));
            }

            if (!keep) {
                this.instance_cull_count--;
                let t = this.instance_cull_result[i];
                this.instance_cull_result[i] = this.instance_cull_result[this.instance_cull_count];
                this.instance_cull_result[this.instance_cull_count] = t;
                i--;
                inst.last_render_pass = 0;
            } else {
                inst.last_render_pass = this.render_pass;
            }
        }

        // PROCESS LIGHTS
        let directional_lights = this.light_instance_cull_result;
        this.directional_light_count = 0;
        let start = this.light_cull_count;

        for (let i = 0; i < p_scenario.directional_lights.length; i++) {
            if (this.light_cull_count + this.directional_light_count >= MAX_LIGHTS_CULLED) {
                break;
            }
            let E = p_scenario.directional_lights[i];
            if (!E.visible) continue;

            let light = /** @type {InstanceLightData} */(E.base_data);

            if (light) {
                directional_lights[start + this.directional_light_count++] = light.instance;
            }
        }
    }

    /**
     * @param {Transform} p_cam_transform
     * @param {CameraMatrix} p_cam_projection
     * @param {boolean} p_cam_ortho
     * @param {import('engine/drivers/webgl/rasterizer_scene').Environment_t} p_force_env
     * @param {Scenario_t} p_scenario
     */
    _render_scene(p_cam_transform, p_cam_projection, p_cam_ortho, p_force_env, p_scenario) {
        /** @type {import('engine/drivers/webgl/rasterizer_scene').Environment_t} */
        let environment = null;
        if (p_force_env) {
            environment = p_force_env;
        } else if (p_scenario.environment) {
            environment = p_scenario.environment;
        } else {
            environment = p_scenario.fallback_environment;
        }

        VSG.scene_render.render_scene(p_cam_transform, p_cam_projection, p_cam_ortho, this.instance_cull_result, this.instance_cull_count, this.light_instance_cull_result, this.light_cull_count + this.directional_light_count, environment);
    }
}
