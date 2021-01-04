import { List as SelfList$List, SelfList } from 'engine/core/self_list';
import { memdelete } from 'engine/core/os/memory';
import { List, Element as List$Element } from 'engine/core/list';
import { clamp, stepify, deg2rad } from 'engine/core/math/math_funcs';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Vector3Like, Vector3 } from 'engine/core/math/vector3';
import { AABB } from 'engine/core/math/aabb';
import { Plane } from 'engine/core/math/plane';
import { Transform } from 'engine/core/math/transform';
import { CameraMatrix } from 'engine/core/math/camera_matrix';
import { Octree } from 'engine/core/math/octree';
import { ProjectSettings } from 'engine/core/project_settings';

import { LightmapCapture_t, Skeleton_t } from 'engine/drivers/webgl/rasterizer_storage';

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
    INSTANCE_GEOMETRY_MASK,

    LIGHT_DIRECTIONAL,
    LIGHT_SPOT,

    LIGHT_PARAM_SHADOW_MAX_DISTANCE,
    LIGHT_PARAM_SHADOW_SPLIT_1_OFFSET,
    LIGHT_PARAM_RANGE,
    LIGHT_PARAM_SPOT_ANGLE,

    LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_OPTIMIZED,
    LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_STABLE,
    SHADOW_CASTING_SETTING_SHADOWS_ONLY,
    LIGHT_OMNI,
    LIGHT_OMNI_SHADOW_DUAL_PARABOLOID,
    VisualServer,
    SHADOW_CASTING_SETTING_OFF,
    SHADOW_CASTING_SETTING_ON,
} from '../visual_server';
import { VSG } from './visual_server_globals';

type Material_t = import('engine/drivers/webgl/rasterizer_storage').Material_t;
type Instantiable_t = import('engine/drivers/webgl/rasterizer_storage').Instantiable_t;
type Mesh_t = import('engine/drivers/webgl/rasterizer_storage').Mesh_t;
type Light_t = import('engine/drivers/webgl/rasterizer_storage').Light_t;

type LightInstance_t = import('engine/drivers/webgl/rasterizer_scene').LightInstance_t;

type Environment_t = import('engine/drivers/webgl/rasterizer_scene').Environment_t;
type ShadowAtlas_t = import('engine/drivers/webgl/rasterizer_scene').ShadowAtlas_t;

const MAX_INSTANCE_CULL = 65536;
const MAX_LIGHTS_CULLED = 4096;

export const CAMERA_PERSPECTIVE = 0;
export const CAMERA_ORTHOGONAL = 1;
export const CAMERA_FRUSTUM = 2;

export class Camera_t {
    get class() { return "Camera_t" }

    type = CAMERA_PERSPECTIVE;
    fov = 70.0;
    znear = 0.05;
    zfar = 100.0;
    size = 1.0;
    offset = new Vector2;
    visible_layers = 0xFFFFFFFF;
    vaspect = false;
    env: Environment_t = null;

    transform = new Transform;
}

let uid_Scenario = 0;
export class Scenario_t {
    get class() { return "Scenario_t" }

    id = uid_Scenario++;

    octree: Octree<Instance_t> = new Octree(true);

    directional_lights: List<Instance_t> = new List;

    environment: Environment_t = null;

    fallback_environment: Environment_t = null;

    instances: SelfList$List<Instance_t> = new SelfList$List;
}

class InstanceBaseData { }

export class Instance_t {
    get class() { return "Instance" }

    base_type = INSTANCE_TYPE_NONE;
    base: Instantiable_t = null;

    skeleton: Skeleton_t = null;
    material_override: Material_t = null;

    transform = new Transform;

    depth_layer = 0;
    layer_mask = 1;

    materials: Material_t[] = [];
    light_instances: import('engine/drivers/webgl/rasterizer_scene').LightInstance_t[] = [];

    blend_values: number[] = [];

    cast_shadows = SHADOW_CASTING_SETTING_ON;

    mirror = false;
    receive_shadows = true;
    visible = true;
    baked_light = false;
    redraw_if_visible = false;

    depth = 0;

    lightmap_capture: Instance_t = null;
    lightmap: import('engine/drivers/webgl/rasterizer_storage').Texture_t = null;

    /** @type {SelfList<Instance_t>} */
    dependency_item: SelfList<Instance_t> = new SelfList(this);

    octree_id = 0;
    /** @type {Scenario_t} */
    scenario: Scenario_t = null;
    /** @type {SelfList<Instance_t>} */
    scenario_item: SelfList<Instance_t> = new SelfList(this);

    update_aabb = false;
    update_materials = false;

    /** @type {SelfList<Instance_t>} */
    update_item: SelfList<Instance_t> = new SelfList(this);

    aabb = new AABB;
    transformed_aabb = new AABB;
    /** @type {AABB} */
    custom_aabb: AABB = null;
    extra_margin = 0;
    /** @type {import('engine/scene/3d/spatial').Spatial} */
    object: import('engine/scene/3d/spatial').Spatial = null;

    last_render_pass = 0;
    last_frame_pass = 0;

    version = 0;

    /** @type {InstanceBaseData} */
    base_data: InstanceBaseData = null;

    _predelete() {
        return true;
    }
    _free() {
        // @Incomplete: require full featured memory system
        // if (this.base_data) memdelete(this.base_data);
        // if (this.custom_aabb) memdelete(this.custom_aabb);
    }

    base_removed() {
        VSG.scene.instance_set_base(this, null);
    }

    /**
     * @param {boolean} p_aabb
     * @param {boolean} p_materials
     */
    base_changed(p_aabb: boolean, p_materials: boolean) {
        VSG.scene._instance_queue_update(this, p_aabb, p_materials);
    }
}


class InstanceGeometryData extends InstanceBaseData {
    get class() { return "InstanceGeometryData" }

    lighting: List<Instance_t> = new List;
    lighting_dirty = false;
    can_cast_shadows = true;
    material_is_animated = true;

    lightmap_captures: List<Instance_t> = new List;
}

class InstanceLightData$PairInfo {
    /** @type {Instance_t} */
    geometry: Instance_t = null;
    /** @type {List$Element<Instance_t>} */
    L: List$Element<Instance_t> = null;
}

class InstanceLightData extends InstanceBaseData {
    /** @type {LightInstance_t} */
    instance: LightInstance_t = null;
    last_version = 0;
    /** @type {List$Element<Instance_t>} */
    D: List$Element<Instance_t> = null;

    shadow_dirty = true;

    /** @type {List<InstanceLightData$PairInfo>} */
    geometries: List<InstanceLightData$PairInfo> = new List;

    /** @type {Instance_t} */
    baked_light: Instance_t = null;
}

class InstanceLightmapCaptureData$PairInfo {
    /** @type {Instance_t} */
    geometry: Instance_t = null;
    /** @type {List$Element<Instance_t>} */
    L: List$Element<Instance_t> = null;
}

class InstanceLightmapCaptureData extends InstanceBaseData {
    /** @type {List<InstanceLightmapCaptureData$PairInfo>} */
    geometries: List<InstanceLightmapCaptureData$PairInfo> = new List;

    /** @type {Instance_t[]} */
    users: Instance_t[] = [];
}

const endpoints = (() => {
    /** @type {Vector3[]} */
    let v: Vector3[] = Array(8);
    for (let i = 0; i < 8; i++) v[i] = new Vector3;
    return v;
})()

const light_frustum_planes = (() => {
    /** @type {Plane[]} */
    let v: Plane[] = Array(6);
    for (let i = 0; i < 6; i++) v[i] = new Plane;
    return v;
})()

export class VisualServerScene {
    render_pass = 0;

    /** @type {SelfList$List<Instance_t>} */
    _instance_update_list: SelfList$List<Instance_t> = new SelfList$List;

    instance_cull_count = 0;
    /** @type {Instance_t[]} */
    instance_cull_result: Instance_t[] = [];
    /** @type {Instance_t[]} */
    instance_shadow_cull_result: Instance_t[] = [];
    /** @type {Instance_t[]} */
    light_cull_result: Instance_t[] = [];
    /** @type {LightInstance_t[]} */
    light_instance_cull_result: LightInstance_t[] = [];
    light_cull_count = 0;
    directional_light_count = 0;

    camera_create() {
        return new Camera_t;
    }

    /**
     * @param {Camera_t} camera
     * @param {number} fov_degrees
     * @param {number} z_near
     * @param {number} z_far
     */
    camera_set_perspective(camera: Camera_t, fov_degrees: number, z_near: number, z_far: number) {
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
    camera_set_orthogonal(camera: Camera_t, size: number, z_near: number, z_far: number) {
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
    camera_set_frustum(camera: Camera_t, size: number, offset: Vector2Like, z_near: number, z_far: number) {
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
    camera_set_transform(camera: Camera_t, transform: Transform) {
        camera.transform.copy(transform).orthonormalize();
    }

    /**
     * @param {Camera_t} camera
     * @param {number} layers
     */
    camera_set_cull_mask(camera: Camera_t, layers: number) {
        camera.visible_layers = layers;
    }

    /**
     * @param {Camera_t} camera
     * @param {boolean} enable
     */
    camera_set_use_vertical_aspect(camera: Camera_t, enable: boolean) {
        camera.vaspect = enable;
    }

    scenario_create() {
        let s = new Scenario_t;

        s.octree.set_balance(ProjectSettings.get_singleton().display.render_tree_balance);

        s.octree.pair_callback = this._instance_pair.bind(this);
        s.octree.unpair_callback = this._instance_unpair.bind(this);

        return s;
    }

    /**
     * @param {Scenario_t} s
     */
    scenario_free(s: Scenario_t) {
        while (s.instances.first()) {
            this.instance_set_scenario(s.instances.first().self(), null);
        }
    }

    /**
     * @param {any} self
     * @param {number} id_A
     * @param {Instance_t} A
     * @param {number} sub_A
     * @param {number} id_B
     * @param {Instance_t} B
     * @param {number} sub_B
     */
    _instance_pair(self: any, id_A: number, A: Instance_t, sub_A: number, id_B: number, B: Instance_t, sub_B: number) {
        if (A.base_type > B.base_type) {
            let t = A;
            A = B;
            B = t;
        }

        if (B.base_type === INSTANCE_TYPE_LIGHT && ((1 << A.base_type) & INSTANCE_GEOMETRY_MASK)) {
            let light: InstanceLightData = B.base_data as InstanceLightData;
            let geom: InstanceGeometryData = A.base_data as InstanceGeometryData;

            let pinfo = new InstanceLightData$PairInfo;
            pinfo.geometry = A;
            pinfo.L = geom.lighting.push_back(B);

            let E = light.geometries.push_back(pinfo);

            if (geom.can_cast_shadows) {
                light.shadow_dirty = true;
            }
            geom.lighting_dirty = true;

            return E;
        } else if (B.base_type === INSTANCE_TYPE_LIGHTMAP_CAPTURE && ((1 << A.base_type) & INSTANCE_GEOMETRY_MASK)) {
            let lightmap_capture = B.base_data as InstanceLightmapCaptureData;
            let geom: InstanceGeometryData = A.base_data as InstanceGeometryData;

            let pinfo = new InstanceLightmapCaptureData$PairInfo;
            pinfo.geometry = A;
            pinfo.L = geom.lightmap_captures.push_back(B);

            let E = lightmap_capture.geometries.push_back(pinfo);
            this._instance_queue_update(A, false, false);

            return E;
        }
        return null;
    }

    /**
     * @param {any} self
     * @param {number} id_A
     * @param {Instance_t} A
     * @param {number} sub_A
     * @param {number} id_B
     * @param {Instance_t} B
     * @param {number} sub_B
     * @param {any} udata
     */
    _instance_unpair(self: any, id_A: number, A: Instance_t, sub_A: number, id_B: number, B: Instance_t, sub_B: number, udata: any) {
        if (A.base_type > B.base_type) {
            let t = A;
            A = B;
            B = t;
        }

        if (B.base_type === INSTANCE_TYPE_LIGHT && ((1 << A.base_type) & INSTANCE_GEOMETRY_MASK)) {
            let light: InstanceLightData = B.base_data as InstanceLightData;
            let geom: InstanceGeometryData = A.base_data as InstanceGeometryData;

            let E: List$Element<InstanceLightData$PairInfo> = /** @type {List$Element<InstanceLightData$PairInfo>} */(udata);

            geom.lighting.erase(E.value.L);
            light.geometries.erase(E);

            if (geom.can_cast_shadows) {
                light.shadow_dirty = true;
            }
            geom.lighting_dirty = true;
        } else if (B.base_type === INSTANCE_TYPE_LIGHTMAP_CAPTURE && ((1 << A.base_type) & INSTANCE_GEOMETRY_MASK)) {
            let lightmap_capture: InstanceLightmapCaptureData = B.base_data as InstanceLightmapCaptureData;
            let geom: InstanceGeometryData = A.base_data as InstanceGeometryData;

            let E: List$Element<InstanceLightmapCaptureData$PairInfo> = /** @type {List$Element<InstanceLightmapCaptureData$PairInfo>} */(udata);

            geom.lightmap_captures.erase(E.value.L);
            lightmap_capture.geometries.erase(E);
            this._instance_queue_update(A, false, false);
        }
    }

    /**
     * @param {Camera_t} camera
     * @param {Scenario_t} scenario
     * @param {Vector2Like} viewport_size
     * @param {ShadowAtlas_t} shadow_atlas
     */
    render_camera(camera: Camera_t, scenario: Scenario_t, viewport_size: Vector2Like, shadow_atlas: ShadowAtlas_t) {
        let camera_matrix = CameraMatrix.create();
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

        this._prepare_scene(camera.transform, camera_matrix, ortho, camera.env, camera.visible_layers, scenario, shadow_atlas);
        this._render_scene(camera.transform, camera_matrix, ortho, camera.env, scenario, shadow_atlas);

        CameraMatrix.free(camera_matrix);
    }

    /**
     * @param {AABB} p_aabb
     * @param {Scenario_t} p_scenario
     */
    instances_cull_aabb(p_aabb: AABB, p_scenario: Scenario_t) { }

    /**
     * @param {Vector3Like} p_from
     * @param {Vector3Like} p_to
     * @param {Scenario_t} p_scenario
     */
    instances_cull_ray(p_from: Vector3Like, p_to: Vector3Like, p_scenario: Scenario_t) { }

    /**
     * @param {Plane[]} p_convex
     * @param {Scenario_t} p_scenario
     */
    instances_cull_convex(p_convex: Plane[], p_scenario: Scenario_t) { }

    instance_create() {
        return new Instance_t;
    }

    /**
     * @param {Instance_t} p_instance
     */
    instance_free(p_instance: Instance_t) {
        this.update_dirty_instances();

        this.instance_set_use_lightmap(p_instance, null, null);
        this.instance_set_scenario(p_instance, null);
        this.instance_set_base(p_instance, null);
        this.instance_geometry_set_material_override(p_instance, null);
        this.instance_attach_skeleton(p_instance, null);

        this.update_dirty_instances();
    }

    /**
     * @param {Instance_t} p_instance
     * @param {number} p_surface
     * @param {Material_t} p_material
     */
    instance_set_surface_material(p_instance: Instance_t, p_surface: number, p_material: Material_t) {
        if (p_instance.base_type === INSTANCE_TYPE_MESH) {
            let mesh: Mesh_t = p_instance.base as Mesh_t;
            p_instance.materials.length = mesh.surfaces.length;
        }

        p_instance.materials[p_surface] = p_material;
        p_instance.base_changed(false, true);
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Material_t} p_material
     */
    instance_geometry_set_material_override(p_instance: Instance_t, p_material: Material_t) {
        p_instance.material_override = p_material;
        p_instance.base_changed(false, true);
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Instantiable_t} p_base
     */
    instance_set_base(p_instance: Instance_t, p_base: Instantiable_t) {
        let scenario = p_instance.scenario;

        if (p_instance.base_type !== INSTANCE_TYPE_NONE) {
            // free anything related to that base
            p_instance.base.instance_list.remove(p_instance.dependency_item);

            if (scenario && p_instance.octree_id) {
                scenario.octree.erase(p_instance.octree_id);
                p_instance.octree_id = 0;
            }

            switch (p_instance.base_type) {
                case INSTANCE_TYPE_LIGHT: {
                    let light: InstanceLightData = p_instance.base_data as InstanceLightData;
                    if (p_instance.scenario && light.D) {
                        p_instance.scenario.directional_lights.erase(light.D);
                        light.D = null;
                    }

                    VSG.scene_render.free_light_instance(light.instance);
                } break;
                case INSTANCE_TYPE_LIGHTMAP_CAPTURE: {
                    let lightmap_capture: InstanceLightmapCaptureData = p_instance.base_data as InstanceLightmapCaptureData;
                    while (lightmap_capture.users.length > 0) {
                        this.instance_set_use_lightmap(lightmap_capture.users[0], null, null);
                    }
                } break;
            }

            if (p_instance.base_data) {
                // @Incomplete: memdelete(p_instance.base_data);
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
                    let light_inst: Light_t = p_base as Light_t;
                    let light = new InstanceLightData;

                    if (scenario && light_inst.type === LIGHT_DIRECTIONAL) {
                        light.D = scenario.directional_lights.push_back(p_instance);
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
                    // @Incomplete: shape blending
                    // if (p_instance.base_type === INSTANCE_TYPE_MESH) {
                    //     p_instance.blend_values.length = VSG.storage.mesh_get_blend_shape_count(p_base);
                    // }
                } break;
                case INSTANCE_TYPE_LIGHTMAP_CAPTURE: {
                    let lightmap_capture = new InstanceLightmapCaptureData;
                    p_instance.base_data = lightmap_capture;
                } break;
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
    instance_set_scenario(p_instance: Instance_t, p_scenario: Scenario_t) {
        if (p_instance.scenario) {
            p_instance.scenario.instances.remove(p_instance.scenario_item);

            if (p_instance.octree_id) {
                p_instance.scenario.octree.erase(p_instance.octree_id);
                p_instance.octree_id = 0;
            }

            switch (p_instance.base_type) {
                case INSTANCE_TYPE_LIGHT: {
                    let light: InstanceLightData = p_instance.base_data as InstanceLightData;
                    if (light.D) {
                        p_instance.scenario.directional_lights.erase(light.D);
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
                    let light: InstanceLightData = p_instance.base_data as InstanceLightData;
                    let light_inst: Light_t = p_instance.base as Light_t;
                    if (light_inst.type === LIGHT_DIRECTIONAL) {
                        light.D = p_scenario.directional_lights.push_back(p_instance);
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
    instance_set_visible(p_instance: Instance_t, p_visible: boolean) {
        if (p_instance.visible === p_visible) return;

        p_instance.visible = p_visible;

        if ((1 << p_instance.base_type) & INSTANCE_GEOMETRY_MASK) {
            let geom: InstanceGeometryData = p_instance.base_data as InstanceGeometryData;

            if (geom.can_cast_shadows) {
                for (let E = geom.lighting.front(); E; E = E.next) {
                    let light: InstanceLightData = E.value.base_data as InstanceLightData;
                    light.shadow_dirty = true;
                }
            }
        }

        switch (p_instance.base_type) {
            case INSTANCE_TYPE_LIGHT: {
                let light = p_instance.base as import('engine/drivers/webgl/rasterizer_storage').Light_t;
                if (light.type !== LIGHT_DIRECTIONAL && p_instance.octree_id && p_instance.scenario) {
                    p_instance.scenario.octree.set_pairable(p_instance.octree_id, p_visible, 1 << INSTANCE_TYPE_LIGHT, p_visible ? INSTANCE_GEOMETRY_MASK : 0);
                }
            } break;
            case INSTANCE_TYPE_LIGHTMAP_CAPTURE: {
                if (p_instance.octree_id && p_instance.scenario) {
                    p_instance.scenario.octree.set_pairable(p_instance.octree_id, p_visible, 1 << INSTANCE_TYPE_LIGHTMAP_CAPTURE, p_visible ? INSTANCE_GEOMETRY_MASK : 0);
                }
            } break;
        }
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Transform} p_transform
     */
    instance_set_transform(p_instance: Instance_t, p_transform: Transform) {
        if (p_instance.transform.exact_equals(p_transform)) return;
        p_instance.transform.copy(p_transform);
        this._instance_queue_update(p_instance, true);
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Instance_t} p_lightmap_instance
     * @param {import('engine/drivers/webgl/rasterizer_storage').Texture_t} p_lightmap
     */
    instance_set_use_lightmap(p_instance: Instance_t, p_lightmap_instance: Instance_t, p_lightmap: import('engine/drivers/webgl/rasterizer_storage').Texture_t) {
        if (p_instance.lightmap_capture) {
            let lightmap_capture = p_instance.lightmap_capture.base_data as InstanceLightmapCaptureData;
            lightmap_capture.users.splice(lightmap_capture.users.indexOf(p_instance), 1);
            p_instance.lightmap = null;
            p_instance.lightmap_capture = null;
        }

        if (p_lightmap_instance) {
            p_instance.lightmap_capture = p_lightmap_instance;

            let lightmap_capture: InstanceLightmapCaptureData = p_instance.lightmap_capture.base_data as InstanceLightmapCaptureData;
            lightmap_capture.users.push(p_instance);
            p_instance.lightmap = p_lightmap;
        }
    }

    /**
     * @param {Instance_t} p_instance
     * @param {AABB} p_aabb
     */
    instance_set_custom_aabb(p_instance: Instance_t, p_aabb: AABB) {
        if (!p_aabb.is_equal_approx(AABB.EMPTY)) {
            if (!p_instance.custom_aabb) {
                p_instance.custom_aabb = p_aabb.clone();
            }
        } else {
            if (p_instance.custom_aabb) {
                AABB.free(p_instance.custom_aabb);
                p_instance.custom_aabb = null;
            }
        }

        if (p_instance.scenario) {
            this._instance_queue_update(p_instance, true, false);
        }
    }

    /**
     * @param {Instance_t} p_instance
     * @param {import('engine/scene/3d/spatial').Spatial} p_obj
     */
    instance_attach_object_instance(p_instance: Instance_t, p_obj: import('engine/scene/3d/spatial').Spatial) {
        p_instance.object = p_obj;
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Skeleton_t} p_skeleton
     */
    instance_attach_skeleton(p_instance: Instance_t, p_skeleton: Skeleton_t) {
        if (p_instance.skeleton === p_skeleton) return;

        if (p_instance.skeleton) {
            VSG.storage.instance_remove_skeleton(p_instance.skeleton, p_instance);
        }

        p_instance.skeleton = p_skeleton;

        if (p_instance.skeleton) {
            VSG.storage.instance_add_skeleton(p_instance.skeleton, p_instance);
        }

        this._instance_queue_update(p_instance, true);
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
    _update_dirty_instance(p_instance: Instance_t) {
        if (p_instance.update_aabb) {
            this._update_instance_aabb(p_instance);
        }

        if (p_instance.update_materials) {
            if (p_instance.base_type === INSTANCE_TYPE_MESH) {
                let new_mat_count = VSG.storage.mesh_get_surface_count(p_instance.base as Mesh_t);
                p_instance.materials.length = new_mat_count;
            }

            if ((1 << p_instance.base_type) & INSTANCE_GEOMETRY_MASK) {
                let geom: InstanceGeometryData = p_instance.base_data as InstanceGeometryData;

                let can_cast_shadows = true;
                let is_animated = false;

                if (p_instance.cast_shadows === SHADOW_CASTING_SETTING_OFF) {
                    can_cast_shadows = false;
                } else if (p_instance.material_override) {
                    can_cast_shadows = VSG.storage.material_casts_shadows(p_instance.material_override);
                    // @Incomplete: is_animated = VSG.storage.material_is_animated(p_instance.material_override);
                } else {
                    // @Incomplete: check whether materials can cast shadows
                }

                if (can_cast_shadows !== geom.can_cast_shadows) {
                    for (let E = geom.lighting.front(); E; E = E.next) {
                        let light: InstanceLightData = E.value.base_data as InstanceLightData;
                        light.shadow_dirty = true;
                    }

                    geom.can_cast_shadows = can_cast_shadows;
                }

                geom.material_is_animated = is_animated;
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
    _update_instance_aabb(p_instance: Instance_t) {
        /** @type {AABB} */
        let new_aabb: AABB = null;
        switch (p_instance.base_type) {
            case INSTANCE_TYPE_MESH: {
                new_aabb = VSG.storage.mesh_get_aabb(p_instance.base as Mesh_t);
            } break;
            case INSTANCE_TYPE_MULTIMESH: {
            } break;
            case INSTANCE_TYPE_IMMEDIATE: {
            } break;
            case INSTANCE_TYPE_PARTICLES: {
            } break;
            case INSTANCE_TYPE_LIGHT: {
                new_aabb = VSG.storage.light_get_aabb(p_instance.base as Light_t);
            } break;
            case INSTANCE_TYPE_LIGHTMAP_CAPTURE: {
                new_aabb = VSG.storage.lightmap_capture_get_bounds(p_instance.base as LightmapCapture_t);
            } break;
        }
        if (!new_aabb) new_aabb = AABB.create();

        if (p_instance.extra_margin) {
            new_aabb.grow_by(p_instance.extra_margin);
        }

        p_instance.aabb.copy(new_aabb);
        AABB.free(new_aabb);
    }

    /**
     * @param {Instance_t} p_instance
     */
    _update_instance(p_instance: Instance_t) {
        p_instance.version++;

        if (p_instance.base_type === INSTANCE_TYPE_LIGHT) {
            let light: InstanceLightData = p_instance.base_data as InstanceLightData;

            VSG.scene_render.light_instance_set_transform(light.instance, p_instance.transform);
            light.shadow_dirty = true;
        }

        if (p_instance.aabb.has_no_surface()) return;

        if ((1 << p_instance.base_type) & INSTANCE_GEOMETRY_MASK) {
            let geom: InstanceGeometryData = p_instance.base_data as InstanceGeometryData;

            if (geom.can_cast_shadows) {
                for (let E = geom.lighting.front(); E; E = E.next) {
                    let light: InstanceLightData = E.value.base_data as InstanceLightData;
                    light.shadow_dirty = true;
                }
            }
        }

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

            if (p_instance.base_type === INSTANCE_TYPE_LIGHT || p_instance.base_type === INSTANCE_TYPE_LIGHTMAP_CAPTURE) {
                pairable_mask = p_instance.visible ? INSTANCE_GEOMETRY_MASK : 0;
                pairable = true;
            }

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
    _instance_queue_update(p_instance: Instance_t, p_update_aabb: boolean, p_update_materials: boolean = false) {
        if (p_update_aabb) {
            p_instance.update_aabb = true;
        }
        if (p_update_materials) {
            p_instance.update_materials = true;
        }
        if (p_instance.update_item.in_list()) return;

        this._instance_update_list.add(p_instance.update_item);
    }

    _prepare_scene(p_cam_transform: Transform, p_cam_projection: CameraMatrix, p_cam_ortho: boolean, p_force_env: Environment_t, p_visible_layers: number, p_scenario: Scenario_t, p_shadow_atlas: ShadowAtlas_t) {
        this.render_pass++;
        let camera_layer_mask = p_visible_layers;

        VSG.scene_render.set_scene_pass(this.render_pass);

        let planes = p_cam_projection.get_projection_planes(p_cam_transform);

        let near_plane = Plane.create().set_point_and_normal(
            p_cam_transform.origin,
            p_cam_transform.basis.get_axis(2).normalize().negate()
        );
        let z_far = p_cam_projection.get_z_far();

        this.instance_cull_result.length = 0;
        this.instance_cull_count = p_scenario.octree.cull_convex(planes, this.instance_cull_result, MAX_INSTANCE_CULL);
        this.light_cull_count = 0;

        for (let i = 0; i < this.instance_cull_count; i++) {
            let inst = this.instance_cull_result[i];

            let keep = false;

            if ((camera_layer_mask & inst.layer_mask) === 0) {
            } else if (inst.base_type === INSTANCE_TYPE_LIGHT && inst.visible) {
                if (this.light_cull_count < MAX_LIGHTS_CULLED) {
                    let light: InstanceLightData = inst.base_data as InstanceLightData;

                    if (!light.geometries.empty()) {
                        // do not add this light if no geometry is affected by it
                        this.light_cull_result[this.light_cull_count] = inst;
                        this.light_instance_cull_result[this.light_cull_count] = light.instance;
                        if (p_shadow_atlas && (inst.base as Light_t).shadow) {
                            VSG.scene_render.light_instance_mark_visible(light.instance);
                        }
                        this.light_cull_count++;
                    }
                }
            } else if (((1 << inst.base_type) & INSTANCE_GEOMETRY_MASK) && inst.visible && inst.cast_shadows !== SHADOW_CASTING_SETTING_SHADOWS_ONLY) {
                keep = true;

                if (inst.redraw_if_visible) {
                    VisualServer.get_singleton().redraw_request();
                }

                let geom: InstanceGeometryData = inst.base_data as InstanceGeometryData;
                if (geom.lighting_dirty) {
                    let l = 0;
                    inst.light_instances.length = geom.lighting.size();

                    for (let E = geom.lighting.front(); E; E = E.next) {
                        let light: InstanceLightData = E.value.base_data as InstanceLightData;
                        inst.light_instances[l++] = light.instance;
                    }

                    geom.lighting_dirty = false;
                }

                inst.depth = near_plane.distance_to(inst.transform.origin);
                inst.depth_layer = clamp(Math.floor(inst.depth * 16 / z_far), 0, 15);
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

        // - directional
        let lights_with_shadow = Array(p_scenario.directional_lights.size());
        let directional_shadow_count = 0;

        for (let E = p_scenario.directional_lights.front(); E; E = E.next) {
            if (this.light_cull_count + this.directional_light_count >= MAX_LIGHTS_CULLED) {
                break;
            }
            if (!E.value.visible) continue;

            let light: InstanceLightData = E.value.base_data as InstanceLightData;

            if (light) {
                let e: Light_t = E.value.base as Light_t;
                if (p_shadow_atlas && e.shadow) {
                    lights_with_shadow[directional_shadow_count++] = E.value;
                }
                directional_lights[start + this.directional_light_count++] = light.instance;
            }
        }

        VSG.scene_render.set_directional_shadow_count(directional_shadow_count);

        for (let i = 0; i < directional_shadow_count; i++) {
            this._light_instance_update_shadow(lights_with_shadow[i], p_cam_transform, p_cam_projection, p_cam_ortho, p_shadow_atlas, p_scenario);
        }

        // - shadow map
        {
            for (let i = 0; i < this.light_cull_count; i++) {
                let inst = this.light_cull_result[i];

                let light_base: Light_t = inst.base as Light_t;

                if (!p_shadow_atlas || !light_base.shadow) {
                    continue;
                }

                let light: InstanceLightData = inst.base_data as InstanceLightData;

                let coverage = 0.0;

                {
                    let cam_xf = p_cam_transform.clone();
                    let zn = p_cam_projection.get_z_near();
                    let p = Plane.create().set_point_and_normal(
                        cam_xf.basis.get_axis(2).scale(-zn).add(cam_xf.origin),
                        cam_xf.basis.get_axis(2).negate()
                    );

                    let vp_half_extents = p_cam_projection.get_viewport_half_extents();

                    switch (light_base.type) {
                        case LIGHT_OMNI: {
                            let radius = light_base.param[LIGHT_PARAM_RANGE];

                            let points = [
                                inst.transform.origin.clone(),
                                cam_xf.basis.get_axis(0).scale(radius).add(inst.transform.origin),
                            ];

                            if (!p_cam_ortho) {
                                for (let j = 0; j < 2; j++) {
                                    if (p.distance_to(points[j]) < 0) {
                                        points[j].z = -zn;
                                    }

                                    p.intersects_segment(cam_xf.origin, points[j], points[j]);
                                }
                            }

                            let screen_diameter = points[0].distance_to(points[1]) * 2;
                            coverage = screen_diameter / (vp_half_extents.x + vp_half_extents.y);
                        } break;
                        case LIGHT_SPOT: {
                            let radius = light_base.param[LIGHT_PARAM_RANGE];
                            let angle = light_base.param[LIGHT_PARAM_SPOT_ANGLE];

                            let w = radius * Math.sin(deg2rad(angle));
                            let d = radius * Math.cos(deg2rad(angle));

                            let base = inst.transform.basis.get_axis(2).normalize().scale(-d)
                                .add(inst.transform.origin)

                            let points = [
                                base,
                                cam_xf.basis.get_axis(0).scale(w).add(base),
                            ];

                            if (!p_cam_ortho) {
                                for (let j = 0; j < 2; j++) {
                                    if (p.distance_to(points[j]) < 0) {
                                        points[j].z = -zn;
                                    }

                                    p.intersects_segment(cam_xf.origin, points[j], points[j]);
                                }
                            }

                            let screen_diameter = points[0].distance_to(points[1]) * 2;
                            coverage = screen_diameter / (vp_half_extents.x + vp_half_extents.y);
                        } break;
                    }

                    Plane.free(p);
                    Transform.free(cam_xf);
                }

                if (light.shadow_dirty) {
                    light.last_version++;
                    light.shadow_dirty = false;
                }

                let redraw = VSG.scene_render.shadow_atlas_update_light(p_shadow_atlas, light.instance, coverage, light.last_version);

                if (redraw) {
                    light.shadow_dirty = this._light_instance_update_shadow(inst, p_cam_transform, p_cam_projection, p_cam_ortho, p_shadow_atlas, p_scenario);
                }
            }
        }
    }

    /**
     * @param {Instance_t} p_instance
     * @param {Transform} p_cam_transform
     * @param {CameraMatrix} p_cam_projection
     * @param {boolean} p_cam_ortho
     * @param {Scenario_t} p_scenario
     * @param {ShadowAtlas_t} p_shadow_atlas
     */
    _light_instance_update_shadow(p_instance: Instance_t, p_cam_transform: Transform, p_cam_projection: CameraMatrix, p_cam_ortho: boolean, p_shadow_atlas: ShadowAtlas_t, p_scenario: Scenario_t) {
        let light: InstanceLightData = p_instance.base_data as InstanceLightData;

        let light_transform = p_instance.transform.clone();
        light_transform.orthonormalize();

        let animated_material_found = false;

        let light_base: Light_t = p_instance.base as Light_t;

        let res = { min: 0, max: 0 };

        switch (light_base.type) {
            case LIGHT_DIRECTIONAL: {
                let max_distance = p_cam_projection.get_z_far();
                let shadow_max = light_base.param[LIGHT_PARAM_SHADOW_MAX_DISTANCE];
                if (shadow_max > 0 && !p_cam_ortho) {
                    max_distance = Math.min(shadow_max, max_distance);
                }
                let z_near = p_cam_projection.get_z_near();
                max_distance = Math.max(max_distance, z_near + 0.001);
                let min_distance = Math.min(z_near, max_distance);

                let depth_range_mode = light_base.directional_range_mode;

                if (depth_range_mode === LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_OPTIMIZED) {
                    let planes = p_cam_projection.get_projection_planes(p_cam_transform);
                    let cull_count = p_scenario.octree.cull_convex(planes, this.instance_shadow_cull_result, MAX_INSTANCE_CULL, INSTANCE_GEOMETRY_MASK);
                    let base = Plane.create().set_point_and_normal(p_cam_transform.origin, p_cam_transform.basis.get_axis(2).negate());

                    let found_items = false;
                    let z_max = -1e20;
                    let z_min = 1e20;

                    for (let i = 0; i < cull_count; i++) {
                        let instance = this.instance_shadow_cull_result[i];
                        let geo: InstanceGeometryData = instance.base_data as InstanceGeometryData;
                        if (!instance.visible || !((1 << instance.base_type) & INSTANCE_GEOMETRY_MASK) || !geo.can_cast_shadows) {
                            continue;
                        }

                        if (geo.material_is_animated) {
                            animated_material_found = true;
                        }

                        instance.transformed_aabb.project_range_in_plane(base, res);

                        if (res.max > z_max) {
                            z_max = res.max;
                        }

                        if (res.min < z_min) {
                            z_min = res.min;
                        }

                        found_items = true;
                    }

                    if (found_items) {
                        min_distance = Math.max(min_distance, z_min);
                        max_distance = Math.min(max_distance, z_max);
                    }
                }

                let range = max_distance - min_distance;

                // @Incomplete: support parallel 2/4 splits shadow modes
                let splits = 1;

                let distances = [min_distance, 0, 0, 0, 0];
                for (let i = 0; i < splits; i++) {
                    distances[i + 1] = min_distance + light_base.param[LIGHT_PARAM_SHADOW_SPLIT_1_OFFSET + i] * range;
                }

                distances[splits] = max_distance;

                let texture_size = VSG.scene_render.get_directional_light_shadow_size(light.instance);

                // @Incomplete: support shadow blend splits
                let overlap = false;

                let first_radius = 0;
                for (let i = 0; i < splits; i++) {
                    let camera_matrix = CameraMatrix.create();

                    let aspect = p_cam_projection.get_aspect();

                    if (p_cam_ortho) {
                        let vp_he = p_cam_projection.get_viewport_half_extents();

                        camera_matrix.set_orthogonal(vp_he.y * 2, aspect, distances[(i === 0) ? i : i - 1], distances[i + 1], false);
                    } else {
                        let fov = p_cam_projection.get_fov();
                        camera_matrix.set_perspective(fov, aspect, distances[(i === 0 || !overlap) ? i : i - 1], distances[i + 1], false);
                    }

                    // obtain the frustum endpoints
                    camera_matrix.get_endpoints(p_cam_transform, endpoints);

                    // obtain light frustum ranges
                    let transform = light_transform.clone();

                    let x_vec = transform.basis.get_axis(0).normalize();
                    let y_vec = transform.basis.get_axis(1).normalize();
                    let z_vec = transform.basis.get_axis(2).normalize();

                    let x_min = 0, x_max = 0;
                    let y_min = 0, y_max = 0;
                    let z_min = 0, z_max = 0;

                    let x_min_cam = 0, x_max_cam = 0;
                    let y_min_cam = 0, y_max_cam = 0;
                    let z_min_cam = 0; // , z_max_cam = 0;

                    let bias_scale = 1;

                    // used for culling
                    for (let j = 0; j < 8; j++) {
                        let d_x = x_vec.dot(endpoints[j]);
                        let d_y = y_vec.dot(endpoints[j]);
                        let d_z = z_vec.dot(endpoints[j]);

                        if (j === 0 || d_x < x_min) {
                            x_min = d_x;
                        }
                        if (j === 0 || d_x > x_max) {
                            x_max = d_x;
                        }

                        if (j === 0 || d_y < y_min) {
                            y_min = d_y;
                        }
                        if (j === 0 || d_y > y_max) {
                            y_max = d_y;
                        }

                        if (j === 0 || d_z < z_min) {
                            z_min = d_z;
                        }
                        if (j === 0 || d_z > z_max) {
                            z_max = d_z;
                        }
                    }

                    {
                        // camera viewport stuff

                        let center = Vector3.create();

                        for (let j = 0; j < 8; j++) {
                            center.add(endpoints[j]);
                        }
                        center.scale(1 / 8);

                        let radius = 0;

                        for (let j = 0; j < 8; j++) {
                            let d = center.distance_to(endpoints[j]);
                            if (d > radius) {
                                radius = d;
                            }
                        }

                        radius *= texture_size / (texture_size - 2); // add texel bt each side

                        if (i === 0) {
                            first_radius = radius;
                        } else {
                            bias_scale = radius / first_radius;
                        }

                        x_max_cam = x_vec.dot(center) + radius;
                        x_min_cam = x_vec.dot(center) - radius;
                        y_max_cam = y_vec.dot(center) + radius;
                        y_min_cam = y_vec.dot(center) - radius;
                        // z_max_cam = z_vec.dot(center) + radius;
                        z_min_cam = z_vec.dot(center) - radius;

                        if (depth_range_mode === LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_STABLE) { // TODO: depth range stable
                            let unit = radius * 2 / texture_size;

                            x_max_cam = stepify(x_max_cam, unit);
                            x_min_cam = stepify(x_min_cam, unit);
                            y_max_cam = stepify(y_max_cam, unit);
                            y_min_cam = stepify(y_min_cam, unit);
                        }

                        Vector3.free(center);
                    }

                    // - right/left
                    light_frustum_planes[0].set(x_vec.x, x_vec.y, x_vec.z, x_max);
                    light_frustum_planes[1].set(-x_vec.x, -x_vec.y, -x_vec.z, -x_min);
                    // - top/bottom
                    light_frustum_planes[2].set(y_vec.x, y_vec.y, y_vec.z, y_max);
                    light_frustum_planes[3].set(-y_vec.x, -y_vec.y, -y_vec.z, -y_min);
                    // - near/far
                    light_frustum_planes[4].set(z_vec.x, z_vec.y, z_vec.z, z_max + 1e6);
                    light_frustum_planes[5].set(-z_vec.x, -z_vec.y, -z_vec.z, -z_min);

                    let cull_count = p_scenario.octree.cull_convex(light_frustum_planes, this.instance_shadow_cull_result, MAX_INSTANCE_CULL, INSTANCE_GEOMETRY_MASK);

                    let near_plane = Plane.create().set_point_and_normal(light_transform.origin, light_transform.basis.get_axis(2).negate());

                    let tmp_plane = Plane.create();
                    for (let j = 0; j < cull_count; j++) {
                        let instance = this.instance_shadow_cull_result[j];
                        let base_data: InstanceGeometryData = instance.base_data as InstanceGeometryData;
                        if (!instance.visible || !((1 << instance.base_type) & INSTANCE_GEOMETRY_MASK) || !base_data.can_cast_shadows) {
                            cull_count--;
                            this.instance_shadow_cull_result[j] = this.instance_shadow_cull_result[cull_count];
                            this.instance_shadow_cull_result[cull_count] = instance;
                            j--;
                            continue;
                        }

                        instance.transformed_aabb.project_range_in_plane(tmp_plane.set(z_vec.x, z_vec.y, z_vec.z, 0), res);
                        instance.depth = near_plane.distance_to(instance.transform.origin);
                        instance.depth_layer = 0;
                        if (res.max > z_max) {
                            z_max = res.max;
                        }
                    }
                    Plane.free(tmp_plane);

                    {
                        let ortho_camera = CameraMatrix.create();

                        let half_x = (x_max_cam - x_min_cam) * 0.5;
                        let half_y = (y_max_cam - y_min_cam) * 0.5;

                        ortho_camera.set_orthogonal_d(-half_x, half_x, -half_y, half_y, 0, z_max - z_min_cam);

                        let ortho_transform = Transform.create();
                        ortho_transform.basis.copy(transform.basis);
                        ortho_transform.origin
                            .copy(x_vec.scale(x_min_cam + half_x))
                            .add(y_vec.scale(y_min_cam + half_y))
                            .add(z_vec.scale(z_max))

                        VSG.scene_render.light_instance_set_shadow_transform(
                            light.instance,
                            ortho_camera, ortho_transform,
                            0, distances[i + 1], i, bias_scale
                        );

                        Transform.free(ortho_transform);
                        CameraMatrix.free(ortho_camera);
                    }

                    VSG.scene_render.render_shadow(light.instance, p_shadow_atlas, i, this.instance_shadow_cull_result, cull_count);

                    Vector3.free(x_vec);
                    Vector3.free(y_vec);
                    Vector3.free(z_vec);

                    Transform.free(transform);
                    CameraMatrix.free(camera_matrix);
                }
            } break;
            case LIGHT_OMNI: {
                let shadow_mode = light_base.omni_shadow_mode;

                if (shadow_mode === LIGHT_OMNI_SHADOW_DUAL_PARABOLOID) {
                    for (let i = 0; i < 2; i++) {
                        let radius = light_base.param[LIGHT_PARAM_RANGE];

                        let z = i === 0 ? -1 : 1;
                        /** @type {Plane[]} */
                        let planes: Plane[] = Array(5);
                        let vec = Vector3.create();
                        planes[0] = light_transform.xform_plane(Plane.create().set(0, 0, z, radius));
                        vec.set(1, 0, z).normalize();
                        planes[1] = light_transform.xform_plane(Plane.create().set(vec.x, vec.y, vec.z, radius));
                        vec.set(-1, 0, z).normalize();
                        planes[2] = light_transform.xform_plane(Plane.create().set(vec.x, vec.y, vec.z, radius));
                        vec.set(0, 1, z).normalize();
                        planes[3] = light_transform.xform_plane(Plane.create().set(vec.x, vec.y, vec.z, radius));
                        vec.set(0, -1, z).normalize();
                        planes[4] = light_transform.xform_plane(Plane.create().set(vec.x, vec.y, vec.z, radius));
                        Vector3.free(vec);

                        let cull_count = p_scenario.octree.cull_convex(planes, this.instance_shadow_cull_result, MAX_INSTANCE_CULL, INSTANCE_GEOMETRY_MASK);

                        let near_plane = Plane.create().set_point_and_normal(light_transform.origin, light_transform.basis.get_axis(2).scale(z));

                        for (let j = 0; j < cull_count; j++) {
                            let instance = this.instance_shadow_cull_result[j];
                            let geom: InstanceGeometryData = instance.base_data as InstanceGeometryData;
                            if (!instance.visible || !((1 << instance.base_type) & INSTANCE_GEOMETRY_MASK) || !geom.can_cast_shadows) {
                                cull_count--;
                                let t = this.instance_shadow_cull_result[j];
                                this.instance_shadow_cull_result[j] = this.instance_shadow_cull_result[cull_count]
                                this.instance_shadow_cull_result[cull_count] = t;
                                j--;
                            } else {
                                instance.depth = near_plane.distance_to(instance.transform.origin);
                                instance.depth_layer = 0;
                            }
                        }

                        let cm = CameraMatrix.create();
                        VSG.scene_render.light_instance_set_shadow_transform(
                            light.instance,
                            cm, light_transform,
                            radius, 0, i
                        )
                        CameraMatrix.free(cm);
                        VSG.scene_render.render_shadow(light.instance, p_shadow_atlas, i, this.instance_shadow_cull_result, cull_count);
                    }
                }
            } break;
            case LIGHT_SPOT: {
                let radius = light_base.param[LIGHT_PARAM_RANGE];
                let angle = light_base.param[LIGHT_PARAM_SPOT_ANGLE];

                let cm = CameraMatrix.create();
                cm.set_perspective(angle * 2, 1, 0.01, radius);

                let planes = cm.get_projection_planes(light_transform);
                let cull_count = p_scenario.octree.cull_convex(planes, this.instance_shadow_cull_result, MAX_INSTANCE_CULL, INSTANCE_GEOMETRY_MASK);

                let near_plane = Plane.create().set_point_and_normal(light_transform.origin, light_transform.basis.get_axis(2).negate());
                for (let j = 0; j < cull_count; j++) {
                    let instance = this.instance_shadow_cull_result[j];
                    let base_data: InstanceGeometryData = instance.base_data as InstanceGeometryData;
                    if (!instance.visible || !((1 << instance.base_type) & INSTANCE_GEOMETRY_MASK) || !base_data.can_cast_shadows) {
                        cull_count--;
                        this.instance_shadow_cull_result[j] = this.instance_shadow_cull_result[cull_count];
                        this.instance_shadow_cull_result[cull_count] = instance;
                        j--;
                    } else {
                        instance.depth = near_plane.distance_to(instance.transform.origin);
                        instance.depth_layer = 0;
                    }
                }

                VSG.scene_render.light_instance_set_shadow_transform(
                    light.instance,
                    cm, light_transform,
                    radius, 0, 0
                );
                VSG.scene_render.render_shadow(light.instance, p_shadow_atlas, 0, this.instance_shadow_cull_result, cull_count);

                CameraMatrix.free(cm);
            } break;
        }

        Transform.free(light_transform);

        return animated_material_found;
    }

    _render_scene(p_cam_transform: Transform, p_cam_projection: CameraMatrix, p_cam_ortho: boolean, p_force_env: Environment_t, p_scenario: Scenario_t, p_shadow_atlas: ShadowAtlas_t) {
        let environment: Environment_t = null;
        if (p_force_env) {
            environment = p_force_env;
        } else if (p_scenario.environment) {
            environment = p_scenario.environment;
        } else {
            environment = p_scenario.fallback_environment;
        }

        VSG.scene_render.render_scene(p_cam_transform, p_cam_projection, p_cam_ortho, this.instance_cull_result, this.instance_cull_count, this.light_instance_cull_result, this.light_cull_count + this.directional_light_count, environment, p_shadow_atlas);
    }
}
