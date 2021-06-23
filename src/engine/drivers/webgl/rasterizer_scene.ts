import { res_class_map } from "engine/registry";
import { remove_item } from "engine/dep/index";
import { Color } from "engine/core/color";
import { lerp, deg2rad, next_power_of_2 } from "engine/core/math/math_funcs";
import { Vector2 } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3";
import { Rect2 } from "engine/core/math/rect2";
import { Basis } from "engine/core/math/basis";
import { Transform } from "engine/core/math/transform";
import { CameraMatrix } from "engine/core/math/camera_matrix";
import { copy_array_values, range_sort } from "engine/core/v_array";
import { OS } from "engine/core/os/os";

import {
    INSTANCE_TYPE_MESH,
    INSTANCE_TYPE_MULTIMESH,
    INSTANCE_TYPE_IMMEDIATE,

    LIGHT_DIRECTIONAL,
    LIGHT_PARAM_ENERGY,
    LIGHT_PARAM_SPECULAR,
    LIGHT_DIRECTIONAL_SHADOW_ORTHOGONAL,
    LIGHT_DIRECTIONAL_SHADOW_PARALLEL_2_SPLITS,
    LIGHT_DIRECTIONAL_SHADOW_PARALLEL_4_SPLITS,

    LIGHT_OMNI,
    LIGHT_PARAM_SHADOW_BIAS_SPLIT_SCALE,
    LIGHT_PARAM_RANGE,
    LIGHT_PARAM_SHADOW_BIAS,
    LIGHT_PARAM_SHADOW_NORMAL_BIAS,
    LIGHT_OMNI_SHADOW_DETAIL_HORIZONTAL,
    LIGHT_OMNI_SHADOW_CUBE,

    LIGHT_SPOT,
    LIGHT_PARAM_ATTENUATION,
    LIGHT_PARAM_SPOT_ANGLE,
    LIGHT_PARAM_SPOT_ATTENUATION,

    VisualServer,
} from "engine/servers/visual/visual_server";
import {
    Instance_t,
} from "engine/servers/visual/visual_server_scene";
import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    ShaderMaterial,
    SpatialMaterial,
} from "engine/scene/resources/material";
import {
    ARRAY_VERTEX,
    ARRAY_NORMAL,
    ARRAY_TEX_UV,
    ARRAY_COLOR,
    ARRAY_BONES,
    ARRAY_WEIGHTS,
    ARRAY_MAX,
} from "engine/scene/const";

import { EffectBlurShader } from "./shaders/blur";
import {
    Mesh_t,
    Surface_t,
    Geometry_t,
    Texture_t,
    Shader_t,
    Material_t,
    Light_t,
    LightmapCapture_t,
    Skeleton_t,
    Sky_t,

    RasterizerStorage,

    BLEND_MODE_MIX,
    BLEND_MODE_ADD,
    BLEND_MODE_SUB,
    BLEND_MODE_MUL,
    CULL_MODE_FRONT,
    CULL_MODE_BACK,
    CULL_MODE_DISABLED,
    DEPTH_DRAW_OPAQUE,
    DEPTH_DRAW_ALPHA_PREPASS,
    DEPTH_DRAW_ALWAYS,
    DEPTH_DRAW_NEVER,
} from "./rasterizer_storage";

import {
    parse_uniforms_from_code,
} from "./shader_parser";

import spatial_vs from "./shaders/spatial.vert";
import spatial_fs from "./shaders/spatial.frag";
import { ProjectSettings } from "engine/core/project_settings";

const UNIFORM_EPSILON = 0.00000001;

export const ENV_BG_CLEAR_COLOR = 0;
export const ENV_BG_COLOR = 1;
export const ENV_BG_SKY = 2;
export const ENV_BG_COLOR_SKY = 3;
export const ENV_BG_CANVAS = 4;
export const ENV_BG_KEEP = 5;
export const ENV_BG_CAMERA_FEED = 6;

const MAX_LIGHTS = 255;

export const LIGHTMODE_NORMAL = 0;
export const LIGHTMODE_UNSHADED = 1;
export const LIGHTMODE_LIGHTMAP = 2;

export const SHADOW_FILTER_NEAREST = 0;
export const SHADOW_FILTER_PCF5 = 1;
export const SHADOW_FILTER_PCF13 = 2;

const INSTANCE_BONE_BASE = 13;

type DiffuseTypes = "burley" | "lambert" | "lambert_wrap" | "oren_nayar" | "toon";
type SpecularTypes = "schlick_ggx" | "blinn" | "toon" | "phone";

const DIFFUSE_LIST: DiffuseTypes[] = [
    "burley",
    "lambert",
    "lambert_wrap",
    "oren_nayar",
    "toon",
]

const SPECULAR_LIST: SpecularTypes[] = [
    "schlick_ggx",
    "blinn",
    "toon",
    "phone",
]

interface MaterialInstanceConfig {
    diffuse: number;
    specular: number;

    spatial: {
        uses_alpha: boolean,
    },
    conditions: (keyof typeof SHADER_DEF)[],

    features: string[];

    params: { [name: string]: number[] };
    textures: { [name: string]: Texture_t };
}

const DEFAULT_MATERIAL_CONFIG: MaterialInstanceConfig = {
    diffuse: 0,
    specular: 0,

    spatial: {
        uses_alpha: false,
    },
    conditions: [],

    features: [
        "albedo",
    ],

    params: {
        m_specular: [0.5],
        m_metallic: [0.0],
        m_roughness: [1.0],
    },
    textures: {},
}

const material_base_table: { [key: string]: Material_t } = {}

export class Environment_t {
    bg_mode = ENV_BG_CLEAR_COLOR;

    sky: Sky_t = null;
    sky_custom_fov = 0;
    sky_orientation = new Basis;

    bg_color = [0, 0, 0, 1];
    bg_energy = [1.0];
    sky_ambient = [0];

    ambient_color = [0, 0, 0, 1];
    ambient_energy = [1.0];
    ambient_sky_contribution = [0.0];

    canvas_max_layer = 0;

    fog_enabled = [0];
    fog_color = [0.5, 0.5, 0.5, 1.0];
    fog_sun_color = [0.8, 0.8, 0.0, 1.0];
    fog_sun_amount = [0];

    fog_depth_enabled = [1];
    fog_depth_begin = [10];
    fog_depth_end = [0];
    fog_depth_curve = [1];

    fog_transmit_enabled = [0];
    fog_transmit_curve = [1];

    fog_height_enabled = [0];
    fog_height_min = [10];
    fog_height_max = [0];
    fog_height_curve = [1];

    // post-process
    dof_blur_far_enabled = [0];
    dof_blur_far_distance = [10];
    dof_blur_far_transition = [5];
    dof_blur_far_amount = [0.1];
    dof_blur_far_quality = [0];

    dof_blur_near_enabled = [0];
    dof_blur_near_distance = [2];
    dof_blur_near_transition = [1];
    dof_blur_near_amount = [0.1];
    dof_blur_near_quality = [0];

    glow_enabled = [0];
    glow_levels = [(1 << 2) | (1 << 4)];
    glow_intensity = [0.8];
    glow_strength = [1];
    glow_bloom = [0];

    adjustments_enabled = [0];
    adjustments_brightness = [1.0];
    adjustments_contrast = [1.0];
    adjustments_saturation = [1.0];

    _load_data(data: any) {
        for (let k in data) {
            if (this.hasOwnProperty(k)) {
                let value = data[k];

                switch (k) {
                    case "sky_custom_fov":
                    case "canvas_max_layer":
                    case "bg_mode": {
                        this[k] = value;
                        continue;
                    }
                }

                if (typeof (value) === "object") {
                    if ("r" in value && "g" in value && "b" in value && "a" in value) {
                        // @ts-ignore
                        this[k] = [value.r, value.g, value.b, value.a];
                    } else {
                        if (value.type === "ProceduralSky" || value.type === "PanoramaSky") {
                            let sky = new (res_class_map[value.type])() as import("engine/scene/resources/sky").PanoramaSky;
                            sky._load_data(value);
                            // @ts-ignore
                            this[k] = sky.sky;
                        }
                    }
                } else if (typeof (value) === "boolean") {
                    // @ts-ignore
                    this[k] = [value ? 1 : 0];
                } else if (typeof (value) === "number") {
                    // @ts-ignore
                    this[k] = [value];
                }
            }
        }
        return this;
    }
}

class ShadowTransform_t {
    camera = new CameraMatrix;
    transform = new Transform;
    farplane = 0;
    split = 0;
    bias_scale = 0;
}

class Shadow_t {
    version = 0;
    alloc_tick = 0;
    owner: LightInstance_t = null;
}

class Quadrant_t {
    subdivision = 0;
    shadows: Shadow_t[] = [];
}

const QUADRANT_SHIFT = 27;
const SHADOW_INDEX_MASK = (1 << QUADRANT_SHIFT) - 1;

export class ShadowAtlas_t {
    quadrants = [
        new Quadrant_t,
        new Quadrant_t,
        new Quadrant_t,
        new Quadrant_t,
    ];

    size_order = [0, 0, 0, 0];
    smallest_subdiv = 0;

    size = 0;

    gl_fbo: WebGLTexture = null;
    gl_depth: WebGLTexture = null;
    gl_color: WebGLTexture = null;

    shadow_owners: Map<LightInstance_t, number> = new Map;
}

export class LightInstance_t {
    light: Light_t = null;

    shadow_transforms = [
        new ShadowTransform_t,
        new ShadowTransform_t,
        new ShadowTransform_t,
        new ShadowTransform_t,
    ];

    transform = new Transform;

    light_vector = new Vector3;
    spot_vector = new Vector3;
    linear_att = 0;

    last_scene_pass = 0;
    last_scene_shadow_pass = 0;

    light_index = 0;
    light_directional_index = 0;

    directional_rect = new Rect2;

    shadow_atlases: Set<ShadowAtlas_t> = new Set;
}

const sort_by_key = (a: Element_t, b: Element_t) => {
    if (a.depth_layer + a.priority === b.depth_layer + b.priority) {
        return (a.geometry_index + a.light_index * 3 + a.skeleton * 7 + a.light_type1 * 6 + a.light_type2 * 5 + a.light_mode * 4 + a.material_index * 2)
            -
            (b.geometry_index + b.light_index * 3 + b.skeleton * 7 + b.light_type1 * 6 + b.light_type2 * 5 + b.light_mode * 4 + b.material_index * 2)
    } else {
        return (a.depth_layer + a.priority) - (b.depth_layer + b.priority);
    }
}

/**
 * @param {Element_t} a
 * @param {Element_t} b
 */
const sort_by_depth = (a: Element_t, b: Element_t) => {
    return a.instance.depth - b.instance.depth;
}

/**
 * @param {Element_t} a
 * @param {Element_t} b
 */
const sort_by_reverse_depth_and_priority = (a: Element_t, b: Element_t) => {
    if (a.priority === b.priority) {
        return b.instance.depth - a.instance.depth;
    } else {
        return a.priority - b.priority;
    }
}

type UseAccum = { value: boolean, owner: Element_t };
const pool_UseAccum: UseAccum[] = [];
function create_UseAccum(owner: Element_t): UseAccum {
    let u = pool_UseAccum.pop();
    if (!u) return { value: false, owner: owner };
    u.owner = owner;
    return u;
}
function free_UseAccum(u: UseAccum) {
    if (pool_UseAccum.indexOf(u) < 0) {
        pool_UseAccum.push(u);
    }
}


class Element_t {
    get use_accum() {
        return this.use_accum_ptr.value
    }
    set use_accum(value) {
        this.use_accum_ptr.value = value;
    }

    instance: Instance_t = null;

    geometry: Geometry_t = null;

    material: Material_t = null;

    use_accum_ptr: UseAccum = create_UseAccum(this);
    front_facing = true;

    // union: depth key
    depth_layer = 0;
    priority = 0;

    // union: sort key
    geometry_index = 0;
    skeleton = 0;
    material_index = 0;
    light_index = 0;
    light_type2 = 0;
    light_type1 = 0;
    light_mode = 0;

    copy(other: Element_t): Element_t {
        this.instance = other.instance;
        this.geometry = other.geometry;
        this.material = other.material;

        free_UseAccum(this.use_accum_ptr);
        this.use_accum_ptr = other.use_accum_ptr;
        this.front_facing = other.front_facing;

        this.depth_layer = other.depth_layer;
        this.priority = other.priority;

        this.geometry_index = other.geometry_index;
        this.material_index = other.material_index;
        this.light_index = other.light_index;

        return this;
    }

    reset(): Element_t {
        this.instance = null;
        this.geometry = null;
        this.material = null;

        if (this.use_accum_ptr.owner !== this) {
            this.use_accum_ptr = create_UseAccum(this);
        }
        this.front_facing = true;

        this.depth_layer = 0;
        this.priority = 0;

        this.geometry_index = 0;
        this.material_index = 0;
        this.light_index = 0;

        return this;
    }
}

class RenderList_t {
    max_elements = 65536;

    base_elements: Element_t[] = [];
    elements: Element_t[] = [];

    element_count = 0;
    alpha_element_count = 0;

    init() {
        this.element_count = 0;
        this.alpha_element_count = 0;

        this.elements.length = 0;
        this.base_elements.length = this.max_elements;
    }

    clear() {
        this.element_count = 0;
        this.alpha_element_count = 0;
    }

    add_element() {
        if (this.element_count + this.alpha_element_count >= this.max_elements) return null;

        if (!this.base_elements[this.element_count]) {
            this.base_elements[this.element_count] = new Element_t;
        }

        this.elements[this.element_count] = this.base_elements[this.element_count].reset();
        return this.elements[this.element_count++];
    }

    add_alpha_element() {
        if (this.element_count + this.alpha_element_count >= this.max_elements) return null;

        let idx = this.max_elements - this.alpha_element_count - 1;

        if (!this.base_elements[idx]) {
            this.base_elements[idx] = new Element_t;
        }

        this.elements[idx] = this.base_elements[idx].reset();
        this.alpha_element_count++;
        return this.elements[idx];
    }

    sort_by_key(p_alpha: boolean) {
        if (p_alpha) {
            range_sort(this.elements, this.max_elements - this.alpha_element_count, this.max_elements - 1, sort_by_key);
        } else {
            range_sort(this.elements, 0, this.element_count - 1, sort_by_key);
        }
    }

    sort_by_depth(p_alpha: boolean) {
        if (p_alpha) {
            range_sort(this.elements, this.max_elements - this.alpha_element_count, this.max_elements - 1, sort_by_depth);
        } else {
            range_sort(this.elements, 0, this.element_count - 1, sort_by_depth);
        }
    }

    sort_by_reverse_depth_and_priority(p_alpha: boolean) {
        if (p_alpha) {
            range_sort(this.elements, this.max_elements - this.alpha_element_count, this.max_elements - 1, sort_by_reverse_depth_and_priority);
        } else {
            range_sort(this.elements, 0, this.element_count - 1, sort_by_reverse_depth_and_priority);
        }
    }
}

let def_id = 0;
const SHADER_DEF = {
    SHADELESS: def_id++,
    BASE_PASS: def_id++,

    ENABLE_TANGENT_INTERP: def_id++,
    ENABLE_NORMALMAP: def_id++,
    ENABLE_COLOR_INTERP: def_id++,
    ENABLE_UV_INTERP: def_id++,
    ENABLE_UV2_INTERP: def_id++,
    USE_SKELETON: def_id++,
    USE_INSTANCING: def_id++,

    USE_LIGHTMAP: def_id++,
    USE_LIGHTING: def_id++,

    USE_SHADOW: def_id++,
    USE_SHADOW_TO_OPACITY: def_id++,

    USE_DEPTH_PREPASS: def_id++,
    RENDER_DEPTH: def_id++,
    USE_RGBA_SHADOWS: def_id++,

    LIGHT_MODE_DIRECTIONAL: def_id++,
    LIGHT_MODE_OMNI: def_id++,
    LIGHT_MODE_SPOT: def_id++,

    DIFFUSE_OREN_NAYAR: def_id++,
    DIFFUSE_LAMBERT_WRAP: def_id++,
    DIFFUSE_TOON: def_id++,
    DIFFUSE_BURLEY: def_id++,

    SPECULAR_BLINN: def_id++,
    SPECULAR_PHONE: def_id++,
    SPECULAR_TOON: def_id++,
    SPECULAR_SCHLICK_GGX: def_id++,

    FOG_DEPTH_ENABLED: def_id++,
    FOG_HEIGHT_ENABLED: def_id++,

    RENDER_DEPTH_DUAL_PARABOLOID: def_id++,

    LIGHT_USE_PSSM2: def_id++,
    LIGHT_USE_PSSM4: def_id++,
    LIGHT_USE_PSSM_BLEND: def_id++,
    LIGHT_USE_RIM: def_id++,

    SHADOW_MODE_PCF_5: def_id++,
    SHADOW_MODE_PCF_13: def_id++,

    USE_SKELETON_SOFTWARE: def_id++,

    ALPHA_SCISSOR_USED: def_id++,

    SCREEN_TEXTURE_USED: def_id++,
    SCREEN_UV_USED: def_id++,

    DEPTH_TEXTURE_USED: def_id++,
};
const SHADER_DEF_NAME_TABLE: { [value: number]: keyof typeof SHADER_DEF } = {};
for (let key in SHADER_DEF) {
    SHADER_DEF_NAME_TABLE[SHADER_DEF[<keyof typeof SHADER_DEF>key]] = <keyof typeof SHADER_DEF>key;
}

const DEFAULT_SPATIAL_ATTRIBS = [
    { name: "vertex_attrib", loc: 0 },
    { name: "normal_attrib", loc: 1 },
    { name: "tangent_attrib", loc: 2 },
    { name: "color_attrib", loc: 3 },
    { name: "uv_attrib", loc: 4 },
    { name: "uv2_attrib", loc: 5 },
    { name: "bone_ids", loc: 6 },
    { name: "bone_weights", loc: 7 },

    { name: "instance_xform_row_0", loc: 8 },
    { name: "instance_xform_row_1", loc: 9 },
    { name: "instance_xform_row_2", loc: 10 },

    { name: "instance_color", loc: 11 },
    { name: "instance_custom_data", loc: 12 },

    { name: "bone_transform_row_0", loc: 13 },
    { name: "bone_transform_row_1", loc: 14 },
    { name: "bone_transform_row_2", loc: 15 },
]

function get_shader_def_code(condition: number[]): string {
    let code = "";
    for (let value of condition) {
        code += `#define ${SHADER_DEF_NAME_TABLE[value]}\n`;
    }
    return code;
}

/* spatial shader feature begin */

const SPATIAL_FEATURES = {
    "general": {
        condition: <(keyof typeof SHADER_DEF)[]>[],
        uniform: `
            uniform highp float m_roughness;
            uniform highp float m_specular;
            uniform highp float m_metallic;
        `,
        fragment: (config: MaterialInstanceConfig) => `
            METALLIC = m_metallic;
            ROUGHNESS = m_roughness;
            SPECULAR = m_specular;
        `,
        value: {
            "m_roughness": [1],
            "m_specular": [0.5],
            "m_metallic": [0],
        },
        texture: {
            // "lightmap": "white",
        },
    },

    "albedo": {
        condition: <(keyof typeof SHADER_DEF)[]>[
            "ENABLE_UV_INTERP"
        ],
        uniform: `
            uniform sampler2D m_texture_albedo;
            uniform highp vec4 m_albedo;
        `,
        fragment: (config: MaterialInstanceConfig) => {
            let code = `
                vec4 m_albedo_tex = texture2D(m_texture_albedo, UV);
                ALBEDO = m_albedo_tex.rgb * m_albedo.rgb;
            `;
            if (config.spatial.uses_alpha) {
                code += `\ALPHA = m_albedo.a * m_albedo_tex.a;`;
            }
            return code;
        },
        value: {
            "m_albedo": [1, 1, 1, 1],
        },
        texture: {
            "m_texture_albedo": "white",
        },
    },
    "emission": {
        condition: <(keyof typeof SHADER_DEF)[]>[
            "ENABLE_UV_INTERP",
        ],
        uniform: `
            uniform sampler2D m_texture_emission;
            uniform highp vec4 m_emission;
            uniform highp float m_emission_energy;
        `,
        fragment: (config: MaterialInstanceConfig) => `
            vec3 m_emission_tex = texture2D(m_texture_emission, UV).rgb;
            EMISSION = (m_emission.rgb + m_emission_tex) * m_emission_energy;
        `,
        value: {
            "m_emission": [0, 0, 0, 1],
            "m_emission_energy": [1],
        },
        texture: {
            "m_texture_emission": "black",
        },
    },
    "rim": {
        condition: <(keyof typeof SHADER_DEF)[]>[
            "LIGHT_USE_RIM",
        ],
        uniform: `
            uniform sampler2D m_texture_rim;
            uniform highp float m_rim;
            uniform highp float m_rim_tint;
        `,
        fragment: (config: MaterialInstanceConfig) => `
            vec2 m_rim_tex = texture2D(m_texture_rim, UV).xy;
            RIM = m_rim * m_rim_tex.x;
            RIM_TINT = m_rim_tint * m_rim_tex.y;
        `,
        value: {
            "m_rim": [1],
            "m_rim_tint": [0.5],
        },
        texture: {
            "m_texture_rim": "white",
        },
    },
}

/* spatial shader feature end */

let sky_vertices = new Float32Array(8 * 3);
let sky_transform_arr = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
]

export class RasterizerScene {
    storage: RasterizerStorage = null;

    // private
    gl: WebGLRenderingContext = null;

    directional_shadow = {
        gl_fbo: null as WebGLFramebuffer,
        gl_depth: null as WebGLTexture,
        gl_color: null as WebGLTexture,

        light_count: 0,
        size: 0,
        current_light: 0,
    };
    shadow_filter_mode = SHADOW_FILTER_PCF5;

    default_material: SpatialMaterial = null;

    render_light_instances: LightInstance_t[] = [];
    render_directional_lights = 0;
    render_light_instance_count = 0;

    state = {
        used_screen_texture: false,

        used_lightmap: false,

        render_no_shadows: false,
        shadow_is_dual_paraboloid: false,
        dual_parboloid_direction: 0,
        dual_parboloid_zfar: 0,

        viewport_size: new Vector2,
        screen_pixel_size: new Vector2,

        default_bg: new Color(0, 0, 0, 1),
        default_ambient: new Color(0, 0, 0, 1),

        current_main_tex: null as WebGLTexture,

        current_shader: null as Shader_t,

        sky_verts: null as WebGLBuffer,

        uniforms: {
            CAMERA_MATRIX: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            INV_CAMERA_MATRIX: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            PROJECTION_MATRIX: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            INV_PROJECTION_MATRIX: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            world_transform: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            TIME: [0],
            VIEWPORT_SIZE: [0, 0],
            SCREEN_PIXEL_SIZE: [0, 0],

            LIGHT_SPECULAR: [0],
            LIGHT_COLOR: [0, 0, 0, 0],
            LIGHT_DIRECTION: [0, 0, 0],

            LIGHT_ATTENUATION: [0],
            LIGHT_SPOT_ATTENUATION: [0],
            LIGHT_SPOT_RANGE: [0],
            LIGHT_SPOT_ANGLE: [0],
            light_range: [0],

            lightmap_energy: [1.0],

            skeleton_texture_size: [0, 0],

            bg_color: [0, 0, 0, 1],
            bg_energy: [1],
            ambient_color: [0, 0, 0, 1],
            ambient_energy: [1],

            light_bias: [0],
            light_normal_bias: [0],

            shadow_color: [0, 0, 0, 1],
            shadow_pixel_size: [0, 0],
            light_shadow_matrix: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            light_shadow_matrix2: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            light_shadow_matrix3: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            light_shadow_matrix4: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            light_split_offsets: [0, 0, 0, 0],
            light_clamp: [0, 0, 0, 0],
            dp_clip: [0],
            shadow_dual_paraboloid_render_zfar: [0],
            shadow_dual_paraboloid_render_side: [0],

            // fog
            fog_color_base: [0.5, 0.5, 0.5, 0],
            fog_sun_color_amount: [0.8, 0.8, 0.0, 1.0],

            fog_transmit_enabled: [0],
            fog_transmit_curve: [1],

            fog_depth_begin: [10],
            fog_max_distance: [0],
            fog_depth_curve: [1],

            fog_height_min: [10],
            fog_height_max: [0],
            fog_height_curve: [1],
        } as { [name: string]: number[] },
        uniform_states: Object.create(null) as { [name: string]: UniformState },
        texture_states: Object.create(null) as { [slot: number]: TextureState },

        conditions: <number[]>[],
        prev_conditions: <number[]>[],

        gl: {
            CULL_FACE: false,
            CULL_FRONT: false,

            DEPTH_TEST: false,
            depthMask: false,
            depthFunc: 0,

            BLEND: false,
        },
    };

    effect_blur_shader: EffectBlurShader = null;

    shadow_atlas_realloc_tolerance_msec = 500;

    render_list = new RenderList_t;

    scene_pass = 0;
    render_pass = 0;

    current_material_index = 0;
    current_geometry_index = 0;
    current_light_index = 0;
    current_shader_index = 0;

    constructor() {
        // record states of all global uniforms
        for (let name in this.state.uniforms) {
            this.state.uniform_states[name] = {
                value: this.state.uniforms[name],
                force_locked: false,
                changed: true,
            };
        }
    }

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl: WebGLRenderingContext) {
        this.gl = gl;

        this.render_list.init();

        this.render_pass = 1;

        {
            /* default material */
            this.default_material = new SpatialMaterial;
            this.default_material._load_data({});
        }

        {
            /* directional shadow */

            this.directional_shadow.light_count = 0;
            this.directional_shadow.size = next_power_of_2(ProjectSettings.get_singleton().display.directional_shadow_size);

            this.directional_shadow.gl_fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.directional_shadow.gl_fbo);

            if (VSG.config.use_rgba_3d_shadows) {
                this.directional_shadow.gl_depth = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, this.directional_shadow.gl_depth);
                gl.renderbufferStorage(gl.RENDERBUFFER, VSG.config.depth_buffer_internalformat, this.directional_shadow.size, this.directional_shadow.size);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.directional_shadow.gl_depth);

                this.directional_shadow.gl_color = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.directional_shadow.gl_color);

                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.directional_shadow.size, this.directional_shadow.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.directional_shadow.gl_color, 0);
            } else {
                this.directional_shadow.gl_depth = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.directional_shadow.gl_depth);

                gl.texImage2D(gl.TEXTURE_2D, 0, VSG.config.depth_internalformat, this.directional_shadow.size, this.directional_shadow.size, 0, gl.DEPTH_COMPONENT, VSG.config.depth_type, null);

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.directional_shadow.gl_depth, 0);
            }
        }

        this.shadow_filter_mode = ProjectSettings.get_singleton().display.shadow_filter_mode;

        {
            this.effect_blur_shader = new EffectBlurShader;
        }

        {
            this.state.sky_verts = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.state.sky_verts);
            gl.bufferData(gl.ARRAY_BUFFER, sky_vertices, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        gl.frontFace(gl.CW);
    }

    iteration() { }

    free_light_instance(light_instance: LightInstance_t) {
        // remove from shadow atlases
        for (let shadow_atlas of light_instance.shadow_atlases) {
            let key = shadow_atlas.shadow_owners.get(light_instance);
            let q = (key >> QUADRANT_SHIFT) & 0x3;
            let s = key & SHADOW_INDEX_MASK;

            shadow_atlas.quadrants[q].shadows[s] = null;
            shadow_atlas.shadow_owners.delete(light_instance);
        }

        // @Incomplete: memdelete(light_instance);
    }

    environment_create() {
        return new Environment_t;
    }

    metarial_instance_create(config: MaterialInstanceConfig) {
        // find base and make a fork
        let base = this.material_base_get(config);
        let inst = base.fork();

        // override params and textures
        for (let k in config.params) {
            inst.params[k] = config.params[k].slice();
        }
        for (let k in config.textures) {
            inst.textures[k] = config.textures[k];
        }

        return inst;
    }

    material_base_get(config: MaterialInstanceConfig) {
        config = Object.assign(Object.create(null), DEFAULT_MATERIAL_CONFIG, config);
        config.params = Object.assign(Object.create(null), DEFAULT_MATERIAL_CONFIG.params, config.params);
        config.textures = Object.assign(Object.create(null), DEFAULT_MATERIAL_CONFIG.textures, config.textures);

        const key = create_shader_config_key(config);
        let base = material_base_table[key];

        if (!base) {
            const mat = new ShaderMaterial(`spatial[${key}]`);

            const features = new Set(["general", ...config.features]);

            // shader code
            let conditions: number[] = [];
            add_to_condition(conditions, `DIFFUSE_${DIFFUSE_LIST[config.diffuse].toUpperCase()}` as (keyof typeof SHADER_DEF));
            add_to_condition(conditions, `SPECULAR_${SPECULAR_LIST[config.specular].toUpperCase()}` as (keyof typeof SHADER_DEF));
            for (let c of config.conditions) {
                add_to_condition(conditions, c);
            }

            let uniforms = ""
            let fragment = ""

            for (let name of features) {
                let feature = SPATIAL_FEATURES[name as (keyof typeof SPATIAL_FEATURES)];

                uniforms += feature.uniform;
                fragment += feature.fragment(config);
                for (let c of feature.condition) {
                    add_to_condition(conditions, c as (keyof typeof SHADER_DEF));
                }
            }

            mat.set_shader(
                "spatial",
                [],

                null,

                null,

                null,
                null,

                fragment,
                uniforms,

                null
            );

            // create material
            base = this.init_shader_material(
                mat,
                spatial_vs,
                spatial_fs,
                conditions
            );

            // spatial flags/params
            Object.assign(base.shader.spatial, config.spatial);

            // default values/textures
            for (let feature of features) {
                // @ts-ignore
                for (let k in SPATIAL_FEATURES[feature].value) {
                    // @ts-ignore
                    base.params[k] = SPATIAL_FEATURES[feature].value[k];
                }
                // @ts-ignore
                for (let k in SPATIAL_FEATURES[feature].texture) {
                    // @ts-ignore
                    base.textures[k] = this.storage.resources[`${SPATIAL_FEATURES[feature].texture[k]}_tex`].texture;
                }
            }

            material_base_table[key] = base;
        }

        return base;
    }

    /**
     * @param {number} p_pass
     */
    set_scene_pass(p_pass: number) {
        this.scene_pass = p_pass;
    }

    set_shader_condition(param: keyof typeof SHADER_DEF, value: boolean) {
        if (value) {
            add_to_condition(this.state.conditions, param);
        } else {
            remove_from_condition(this.state.conditions, param);
        }
    }

    /**
     * @param {Light_t} p_light
     */
    light_instance_create(p_light: Light_t) {
        let light_instance = new LightInstance_t;
        light_instance.light = p_light;
        light_instance.light_index = 0xFFFF;
        return light_instance;
    }

    /**
     * @param {LightInstance_t} p_light
     * @param {Transform} p_transform
     */
    light_instance_set_transform(p_light: LightInstance_t, p_transform: Transform) {
        p_light.transform.copy(p_transform);
    }

    light_instance_set_shadow_transform(p_light: LightInstance_t, p_projection: CameraMatrix, p_transform: Transform, p_far: number, p_split: number, p_pass: number, p_bias_scale: number = 1.0) {
        if (p_light.light.type !== LIGHT_DIRECTIONAL) {
            p_pass = 0;
        }

        p_light.shadow_transforms[p_pass].camera.copy(p_projection);
        p_light.shadow_transforms[p_pass].transform.copy(p_transform);
        p_light.shadow_transforms[p_pass].farplane = p_far;
        p_light.shadow_transforms[p_pass].split = p_split;
        p_light.shadow_transforms[p_pass].bias_scale = p_bias_scale;
    }

    /**
     * @param {LightInstance_t} p_light
     */
    light_instance_mark_visible(p_light: LightInstance_t) {
        p_light.last_scene_pass = this.scene_pass;
    }

    /**
     * @param {number} p_count
     */
    set_directional_shadow_count(p_count: number) {
        this.directional_shadow.light_count = p_count;
        this.directional_shadow.current_light = 0;
    }

    get_directional_light_shadow_size(p_light: LightInstance_t) {
        let shadow_size = 0;

        if (this.directional_shadow.light_count === 1) {
            shadow_size = this.directional_shadow.size;
        } else {
            shadow_size = (this.directional_shadow.size / 2) | 0;
        }

        switch (p_light.light.directional_shadow_mode) {
            case LIGHT_DIRECTIONAL_SHADOW_ORTHOGONAL: break;
            case LIGHT_DIRECTIONAL_SHADOW_PARALLEL_2_SPLITS:
            case LIGHT_DIRECTIONAL_SHADOW_PARALLEL_4_SPLITS: {
                shadow_size = Math.floor(shadow_size / 2);
            } break;
        }

        return shadow_size;
    }

    shadow_atlas_create() {
        let atlas = new ShadowAtlas_t;
        for (let i = 0; i < 4; i++) {
            atlas.size_order[i] = i;
        }
        return atlas;
    }

    /**
     * @param {ShadowAtlas_t} shadow_atlas
     * @param {number} p_size
     */
    shadow_atlas_set_size(shadow_atlas: ShadowAtlas_t, p_size: number) {
        p_size = next_power_of_2(p_size);

        if (p_size === shadow_atlas.size) {
            return;
        }

        const gl = this.gl;

        // erase old atlas
        if (shadow_atlas.gl_fbo) {
            if (VSG.config.use_rgba_3d_shadows) {
                gl.deleteRenderbuffer(shadow_atlas.gl_depth);
            } else {
                gl.deleteTexture(shadow_atlas.gl_depth);
            }
            gl.deleteFramebuffer(shadow_atlas.gl_fbo);
            if (shadow_atlas.gl_color) {
                gl.deleteTexture(shadow_atlas.gl_color);
            }
        }

        // erase shadow atlas ref from lights
        for (let [li, _] of shadow_atlas.shadow_owners) {
            li.shadow_atlases.delete(shadow_atlas);
        }

        shadow_atlas.shadow_owners.clear();

        shadow_atlas.size = p_size;

        if (shadow_atlas.size) {
            shadow_atlas.gl_fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, shadow_atlas.gl_fbo);

            // create a depth texture
            gl.activeTexture(gl.TEXTURE0);

            if (VSG.config.use_rgba_3d_shadows) {
                shadow_atlas.gl_depth = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, shadow_atlas.gl_depth);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, shadow_atlas.size, shadow_atlas.size);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, shadow_atlas.gl_depth);

                shadow_atlas.gl_color = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, shadow_atlas.gl_color);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shadow_atlas.size, shadow_atlas.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadow_atlas.gl_color, 0);
            } else {
                shadow_atlas.gl_depth = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, shadow_atlas.gl_depth);
                gl.texImage2D(gl.TEXTURE_2D, 0, VSG.config.depth_internalformat, shadow_atlas.size, shadow_atlas.size, 0, gl.DEPTH_COMPONENT, VSG.config.depth_type, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadow_atlas.gl_depth, 0);
            }
            gl.viewport(0, 0, shadow_atlas.size, shadow_atlas.size);

            gl.depthMask(true);
            this.state.gl.depthMask = true;

            gl.clearDepth(0.0);
            gl.clear(gl.DEPTH_BUFFER_BIT);

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

    /**
     * @param {ShadowAtlas_t} shadow_atlas
     * @param {number[]} p_quadrants
     * @param {number} p_quadrant_count
     * @param {number} p_current_subdiv
     * @param {number} p_tick
     * @param {{ quadrant: number, shadow: number }} result
     */
    _shadow_atlas_find_shadow(shadow_atlas: ShadowAtlas_t, p_quadrants: number[], p_quadrant_count: number, p_current_subdiv: number, p_tick: number, result: { quadrant: number; shadow: number; }) {
        for (let i = p_quadrant_count - 1; i >= 0; i--) {
            let qidx = p_quadrants[i];

            if (shadow_atlas.quadrants[qidx].subdivision === Math.floor(p_current_subdiv)) {
                return false;
            }

            let sarr = shadow_atlas.quadrants[qidx].shadows;
            let sc = sarr.length;

            let found_free_idx = -1;
            let found_used_idx = -1;
            let min_pass = 0;

            for (let j = 0; j < sc; j++) {
                if (!sarr[j].owner) {
                    found_free_idx = j;
                    break;
                }

                let sli = sarr[j].owner;

                if (sli.last_scene_pass !== this.scene_pass) {
                    if (p_tick - sarr[j].alloc_tick < this.shadow_atlas_realloc_tolerance_msec) {
                        continue;
                    }

                    if (found_used_idx === -1 || sli.last_scene_pass < min_pass) {
                        found_used_idx = j;
                        min_pass = sli.last_scene_pass;
                    }
                }
            }

            if (found_free_idx === -1 && found_used_idx === -1) {
                continue;
            }

            if (found_free_idx === -1 && found_used_idx !== -1) {
                found_free_idx = found_used_idx;
            }

            result.quadrant = qidx;
            result.shadow = found_free_idx;

            return true;
        }

        return false;
    }

    /**
     * @param {ShadowAtlas_t} shadow_atlas
     * @param {number} p_quadrant
     * @param {number} p_subdivision
     */
    shadow_atlas_set_quadrant_subdivision(shadow_atlas: ShadowAtlas_t, p_quadrant: number, p_subdivision: number) {
        let subdiv = next_power_of_2(Math.floor(p_subdivision));

        subdiv = Math.floor(Math.sqrt(subdiv));

        if (shadow_atlas.quadrants[p_quadrant].shadows.length === subdiv) {
            return;
        }

        // erase all data from quadrant
        for (let s of shadow_atlas.quadrants[p_quadrant].shadows) {
            if (s.owner) {
                shadow_atlas.shadow_owners.delete(s.owner);
                s.owner.shadow_atlases.delete(shadow_atlas);
            }
        }

        shadow_atlas.quadrants[p_quadrant].shadows.length = 0;
        shadow_atlas.quadrants[p_quadrant].shadows.length = subdiv;
        for (let i = 0; i < subdiv; i++) {
            shadow_atlas.quadrants[p_quadrant].shadows[i] = new Shadow_t;
        }
        shadow_atlas.quadrants[p_quadrant].subdivision = subdiv;

        // cache the smallest subdivision for faster allocation

        shadow_atlas.smallest_subdiv = 1 << 30;

        for (let i = 0; i < 4; i++) {
            if (shadow_atlas.quadrants[i].subdivision) {
                shadow_atlas.smallest_subdiv = Math.min(shadow_atlas.smallest_subdiv, shadow_atlas.quadrants[i].subdivision);
            }
        }

        if (shadow_atlas.smallest_subdiv === 1 << 30) {
            shadow_atlas.smallest_subdiv = 0;
        }

        // re-sort the quadrants

        let swaps = 0;
        do {
            swaps = 0;

            for (let i = 0; i < 3; i++) {
                if (shadow_atlas.quadrants[shadow_atlas.size_order[i]].subdivision < shadow_atlas.quadrants[shadow_atlas.size_order[i + 1]].subdivision) {
                    let t = shadow_atlas.size_order[i];
                    shadow_atlas.size_order[i] = shadow_atlas.size_order[i + 1];
                    shadow_atlas.size_order[i + 1] = t;
                    swaps++;
                }
            }
        } while (swaps > 0);
    }

    /**
     * @param {ShadowAtlas_t} p_shadow_atlas
     * @param {LightInstance_t} p_light_instance
     * @param {number} p_coverage
     * @param {number} p_light_version
     */
    shadow_atlas_update_light(p_shadow_atlas: ShadowAtlas_t, p_light_instance: LightInstance_t, p_coverage: number, p_light_version: number) {
        if (p_shadow_atlas.size === 0 || p_shadow_atlas.smallest_subdiv === 0) {
            return false;
        }

        let quad_size = p_shadow_atlas.size >> 1;
        let desired_fit = Math.min(quad_size / p_shadow_atlas.smallest_subdiv, next_power_of_2(quad_size * p_coverage));

        let valid_quadrants = [0, 0, 0, 0];
        let valid_quadrant_count = 0;
        let best_size = -1;
        let best_subdiv = -1;

        let result = {
            quadrant: 0,
            shadow: 0,
        };

        for (let i = 0; i < 4; i++) {
            let q = p_shadow_atlas.size_order[i];
            let sd = p_shadow_atlas.quadrants[q].subdivision;

            if (sd === 0) continue;

            let max_fit = quad_size / sd;

            if (best_size !== -1 && max_fit > best_size) {
                break;
            }

            valid_quadrants[valid_quadrant_count] = q;
            valid_quadrant_count++;

            best_subdiv = sd;

            if (max_fit >= desired_fit) {
                best_size = max_fit;
            }
        }

        let tick = OS.get_singleton().get_ticks_msec();

        if (p_shadow_atlas.shadow_owners.has(p_light_instance)) {
            // light was already known!

            let key = p_shadow_atlas.shadow_owners.get(p_light_instance);
            let q = (key >> QUADRANT_SHIFT) & 0x03;
            let s = key & SHADOW_INDEX_MASK;

            let should_realloc = p_shadow_atlas.quadrants[q].subdivision !== Math.floor(best_subdiv) && (p_shadow_atlas.quadrants[q].shadows[s].alloc_tick - tick > this.shadow_atlas_realloc_tolerance_msec);

            let should_redraw = p_shadow_atlas.quadrants[q].shadows[s].version !== p_light_version;

            if (!should_realloc) {
                p_shadow_atlas.quadrants[q].shadows[s].version = p_light_version;
                return should_redraw;
            }

            // find a better place

            if (this._shadow_atlas_find_shadow(p_shadow_atlas, valid_quadrants, valid_quadrant_count, p_shadow_atlas.quadrants[q].subdivision, tick, result)) {
                let sh = p_shadow_atlas.quadrants[result.quadrant].shadows[result.shadow];

                if (sh.owner) {
                    p_shadow_atlas.shadow_owners.delete(sh.owner);
                    sh.owner.shadow_atlases.delete(p_shadow_atlas);
                }

                // erase previous
                p_shadow_atlas.quadrants[q].shadows[s].version = 0;
                p_shadow_atlas.quadrants[q].shadows[s].owner = null;

                sh.owner = p_light_instance;
                sh.alloc_tick = tick;
                sh.version = p_light_version;
                p_light_instance.shadow_atlases.add(p_shadow_atlas);

                // make a new key
                key = result.quadrant << QUADRANT_SHIFT;
                key |= result.shadow;

                // update it in the map
                p_shadow_atlas.shadow_owners.set(p_light_instance, key);

                // mark it dirty
                return true;
            }

            // no better place found, so we keep the current place
            p_shadow_atlas.quadrants[q].shadows[s].version = p_light_version;

            return should_redraw;
        }

        if (this._shadow_atlas_find_shadow(p_shadow_atlas, valid_quadrants, valid_quadrant_count, -1, tick, result)) {
            let sh = p_shadow_atlas.quadrants[result.quadrant].shadows[result.shadow];

            if (sh.owner) {
                p_shadow_atlas.shadow_owners.delete(sh.owner);
                sh.owner.shadow_atlases.delete(p_shadow_atlas);
            }

            sh.owner = p_light_instance;
            sh.alloc_tick = tick;
            sh.version = p_light_version;
            p_light_instance.shadow_atlases.add(p_shadow_atlas);

            // make a new key
            let key = result.quadrant << QUADRANT_SHIFT;
            key |= result.shadow;

            // update it in the map
            p_shadow_atlas.shadow_owners.set(p_light_instance, key);

            // mark it dirty
            return true;
        }

        return false;
    }

    render_scene(p_cam_transform: Transform, p_cam_projection: CameraMatrix, p_cam_ortho: boolean, p_cull_result: Instance_t[], p_cull_count: number, p_light_cull_result: LightInstance_t[], p_light_cull_count: number, p_env: Environment_t, p_shadow_atlas: ShadowAtlas_t) {
        const cam_transform = _i_render_scene_Transform_1.copy(p_cam_transform);

        let viewport_width = 0, viewport_height = 0;
        let viewport_x = 0, viewport_y = 0;
        let reverse_cull = false;

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.VFLIP) {
            let negate_axis = cam_transform.basis.get_axis(1, _i_render_scene_Vector3_1).negate();
            cam_transform.basis.set_axis(1, negate_axis);
            reverse_cull = true;
        }

        this.state.render_no_shadows = false;
        let current_fb = this.storage.frame.current_rt.gl_fbo;

        viewport_width = this.storage.frame.current_rt.width;
        viewport_height = this.storage.frame.current_rt.height;
        viewport_x = this.storage.frame.current_rt.x;

        if (this.storage.frame.current_rt.flags.DIRECT_TO_SCREEN) {
            viewport_y = OS.get_singleton().get_window_size().height - viewport_height - this.storage.frame.current_rt.y;
        } else {
            viewport_y = this.storage.frame.current_rt.y;
        }

        this.state.current_shader = null;
        this.state.prev_conditions.length = 0;
        this.state.conditions.length = 0;

        this.state.used_screen_texture = false;
        this.state.viewport_size.set(viewport_width, viewport_height);
        this.state.screen_pixel_size.set(1.0 / viewport_width, 1.0 / viewport_height);

        if (p_light_cull_count) {
            this.render_light_instance_count = Math.min(MAX_LIGHTS, p_light_cull_count);
            this.render_light_instances.length = this.render_light_instance_count;
            this.render_directional_lights = 0;

            // directional lights are at the end, put them at the beginning
            let index = 0;
            for (let i = this.render_light_instance_count - 1; i >= 0; i--) {
                let light: LightInstance_t = /** @type {LightInstance_t} */(p_light_cull_result[i]);

                if (light.light.type === LIGHT_DIRECTIONAL) {
                    this.render_directional_lights++;
                }

                light.light_index = index;
                this.render_light_instances[index] = light;

                index++;
            }
        } else {
            this.render_light_instances.length = 0;
            this.render_directional_lights = 0;
            this.render_light_instance_count = 0;
        }

        if (p_env && p_env.bg_mode === ENV_BG_CANVAS) {
            this._copy_texture_to_buffer(this.storage.frame.current_rt.gl_color, this.storage.frame.current_rt.copy_screen_effect.gl_fbo);
        }

        this.render_list.clear();
        this._fill_render_list(p_cull_result, p_cull_count, false, false);

        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, current_fb);
        gl.viewport(viewport_x, viewport_y, viewport_width, viewport_height);

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.DIRECT_TO_SCREEN) {
            gl.scissor(viewport_x, viewport_y, viewport_width, viewport_height);
            gl.enable(gl.SCISSOR_TEST);
        }

        gl.depthFunc(gl.LEQUAL);
        this.state.gl.depthFunc = gl.LEQUAL;
        gl.depthMask(true);
        this.state.gl.depthMask = true;
        gl.enable(gl.DEPTH_TEST);
        this.state.gl.DEPTH_TEST = true;
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // clear color

        const clear_color = _i_render_scene_Color_1.set(0, 0, 0, 1);

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.TRANSPARENT) {
            clear_color.set(0, 0, 0, 0);
            this.storage.frame.clear_request = false;
        } else if (!p_env || p_env.bg_mode === ENV_BG_CLEAR_COLOR || p_env.bg_mode === ENV_BG_SKY) {
            if (this.storage.frame.clear_request) {
                clear_color.copy(this.storage.frame.clear_request_color);
                this.storage.frame.clear_request = false;
            }
        } else if (p_env.bg_mode === ENV_BG_CANVAS || p_env.bg_mode === ENV_BG_COLOR || p_env.bg_mode === ENV_BG_COLOR_SKY) {
            clear_color.set(p_env.bg_color[0], p_env.bg_color[1], p_env.bg_color[2], p_env.bg_color[3]);
            this.storage.frame.clear_request = false;
        } else {
            this.storage.frame.clear_request = false;
        }

        if (!p_env || p_env.bg_mode !== ENV_BG_KEEP) {
            gl.clearColor(clear_color.r, clear_color.g, clear_color.b, clear_color.a);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        this.state.default_ambient.set(clear_color.r, clear_color.g, clear_color.b, 1.0);
        this.state.default_bg.set(clear_color.r, clear_color.g, clear_color.b, 1.0);

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.DIRECT_TO_SCREEN) {
            gl.disable(gl.SCISSOR_TEST);
        }

        gl.vertexAttrib4f(ARRAY_COLOR, 1, 1, 1, 1);

        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        /** @type {Sky_t} */
        let sky: Sky_t = null;
        // /** @type {WebGLTexture} */
        // let env_radiance_tex = null;

        if (p_env) {
            switch (p_env.bg_mode) {
                case ENV_BG_COLOR_SKY:
                case ENV_BG_SKY: {
                    sky = p_env.sky;

                    if (sky) {
                        // env_radiance_tex = sky.radiance;
                    }
                } break;
                case ENV_BG_CAMERA_FEED: {
                } break;
                case ENV_BG_CANVAS: {
                    this._copy_texture_to_buffer(this.storage.frame.current_rt.copy_screen_effect.gl_color, current_fb);
                } break;
            }
        }

        // opaque pass first
        this.render_list.sort_by_key(false);
        this._render_render_list(this.render_list.elements, 0, this.render_list.element_count, cam_transform, p_cam_projection, p_shadow_atlas, p_env, 0, 0, reverse_cull, false, false);

        if (p_env && p_env.bg_mode === ENV_BG_SKY && (!this.storage.frame.current_rt || !this.storage.frame.current_rt.flags.TRANSPARENT)) {
            if (sky && sky.panorama) {
                this._draw_sky(sky, p_cam_projection, cam_transform, false, p_env.sky_custom_fov, p_env.bg_energy[0], p_env.sky_orientation);
            }
        }

        if (this.storage.frame.current_rt && this.state.used_screen_texture) {
            // copy screen texture
            this.storage.canvas._copy_screen(Rect2.EMPTY);
        }

        // alpha pass second
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        this.render_list.sort_by_reverse_depth_and_priority(true);
        this._render_render_list(this.render_list.elements, this.render_list.max_elements - this.render_list.alpha_element_count, this.render_list.alpha_element_count, cam_transform, p_cam_projection, p_shadow_atlas, p_env, 0, 0, reverse_cull, true, false);

        this._post_process(p_env, p_cam_projection);
    }

    render_shadow(light_instance: LightInstance_t, p_shadow_atlas: ShadowAtlas_t, p_pass: number, p_cull_result: Instance_t[], p_cull_count: number) {
        this.state.render_no_shadows = false;

        let light = light_instance.light;

        let x = 0, y = 0, width = 0, height = 0;

        let zfar = 0;
        let flip_facing = false;
        let custom_vp_size = 0;
        /** @type {WebGLFramebuffer} */
        let gl_fbo: WebGLFramebuffer = null;

        let bias = 0;
        let normal_bias = 0;

        const light_projection = _i_render_shadow_CameraMatrix_1.identity();
        const light_transform = _i_render_shadow_Transform_1.identity();

        this.state.current_shader = null;
        this.state.prev_conditions.length = 0;
        this.state.conditions.length = 0;

        if (light.type === LIGHT_DIRECTIONAL) {
            light_instance.light_directional_index = this.directional_shadow.current_light;
            light_instance.last_scene_shadow_pass = this.scene_pass;

            this.directional_shadow.current_light++;

            if (this.directional_shadow.light_count === 1) {
                light_instance.directional_rect.set(0, 0, this.directional_shadow.size, this.directional_shadow.size);
            } else if (this.directional_shadow.light_count === 2) {
                light_instance.directional_rect.set(0, 0, this.directional_shadow.size, this.directional_shadow.size * 0.5);
            } else {
                /* 3 and 4 */
                light_instance.directional_rect.set(0, 0, this.directional_shadow.size * 0.5, this.directional_shadow.size * 0.5);
                if (light_instance.light_directional_index & 1) {
                    light_instance.directional_rect.x += light_instance.directional_rect.width;
                }
                if (light_instance.light_directional_index >= 2) {
                    light_instance.directional_rect.y += light_instance.directional_rect.height;
                }
            }

            light_projection.copy(light_instance.shadow_transforms[p_pass].camera);
            light_transform.copy(light_instance.shadow_transforms[p_pass].transform);

            x = light_instance.directional_rect.x;
            y = light_instance.directional_rect.y;
            width = light_instance.directional_rect.width;
            height = light_instance.directional_rect.height;

            let bias_mult = lerp(1, light_instance.shadow_transforms[p_pass].bias_scale, light.param[LIGHT_PARAM_SHADOW_BIAS_SPLIT_SCALE]);
            zfar = light.param[LIGHT_PARAM_RANGE];
            bias = light.param[LIGHT_PARAM_SHADOW_BIAS] * bias_mult;
            normal_bias = light.param[LIGHT_PARAM_SHADOW_NORMAL_BIAS] * bias_mult;

            gl_fbo = this.directional_shadow.gl_fbo;
        } else {
            gl_fbo = p_shadow_atlas.gl_fbo;
            let key = p_shadow_atlas.shadow_owners.get(light_instance);

            let quadrant = (key >> QUADRANT_SHIFT) & 0x03;
            let shadow = key >> SHADOW_INDEX_MASK;

            let quadrant_size = p_shadow_atlas.size >> 1;

            x = (quadrant & 1) * quadrant_size;
            y = (quadrant >> 1) * quadrant_size;

            let shadow_size = (quadrant_size / p_shadow_atlas.quadrants[quadrant].subdivision);
            x += Math.floor(shadow % p_shadow_atlas.quadrants[quadrant].subdivision) * shadow_size;
            y += Math.floor(shadow / p_shadow_atlas.quadrants[quadrant].subdivision) * shadow_size;

            width = shadow_size;
            height = shadow_size;

            if (light.type === LIGHT_OMNI) {
                if (light.omni_shadow_mode === LIGHT_OMNI_SHADOW_CUBE) {
                    // @Incomplete: cubemap omni shadow
                } else {
                    this.state.shadow_is_dual_paraboloid = true;
                    light_projection.copy(light_instance.shadow_transforms[0].camera);
                    light_transform.copy(light_instance.shadow_transforms[0].transform);

                    if (light.omni_shadow_detail === LIGHT_OMNI_SHADOW_DETAIL_HORIZONTAL) {
                        height /= 2;
                        y += p_pass * height;
                    } else {
                        width /= 2;
                        x += p_pass * width;
                    }

                    this.state.dual_parboloid_direction = p_pass === 0 ? 1 : -1;
                    flip_facing = (p_pass === 1);
                    zfar = light.param[LIGHT_PARAM_RANGE];
                    bias = light.param[LIGHT_PARAM_SHADOW_BIAS];

                    this.state.dual_parboloid_zfar = zfar;

                    this.set_shader_condition("RENDER_DEPTH_DUAL_PARABOLOID", true);
                }
            } else {
                light_projection.copy(light_instance.shadow_transforms[0].camera);
                light_transform.copy(light_instance.shadow_transforms[0].transform);

                flip_facing = false;
                zfar = light.param[LIGHT_PARAM_RANGE];
                bias = light.param[LIGHT_PARAM_SHADOW_BIAS];
                normal_bias = light.param[LIGHT_PARAM_SHADOW_NORMAL_BIAS];
            }
        }

        this.render_list.clear();
        this._fill_render_list(p_cull_result, p_cull_count, true, true);

        this.render_list.sort_by_depth(false);

        const gl = this.gl;

        gl.disable(gl.BLEND);
        gl.disable(gl.DITHER);
        gl.enable(gl.DEPTH_TEST);

        gl.bindFramebuffer(gl.FRAMEBUFFER, gl_fbo);

        gl.depthMask(true);
        if (!VSG.config.use_rgba_3d_shadows) {
            gl.colorMask(false, false, false, false);
        }

        if (custom_vp_size) {
            gl.viewport(0, 0, custom_vp_size, custom_vp_size);
            gl.scissor(0, 0, custom_vp_size, custom_vp_size);
        } else {
            gl.viewport(x, y, width, height);
            gl.scissor(x, y, width, height);
        }

        gl.enable(gl.SCISSOR_TEST);
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        if (VSG.config.use_rgba_3d_shadows) {
            gl.clearColor(1, 1, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.disable(gl.SCISSOR_TEST);

        if (light.reverse_cull) {
            flip_facing = !flip_facing;
        }

        this.set_shader_condition("RENDER_DEPTH", true);
        this.set_shader_condition("USE_RGBA_SHADOWS", VSG.config.use_rgba_3d_shadows);

        this._render_render_list(this.render_list.elements, 0, this.render_list.element_count, light_transform, light_projection, null, null, bias, normal_bias, flip_facing, false, true);

        this.set_shader_condition("RENDER_DEPTH", false);
        this.set_shader_condition("USE_RGBA_SHADOWS", false);
        this.set_shader_condition("RENDER_DEPTH_DUAL_PARABOLOID", false);

        if (this.storage.frame.current_rt) {
            gl.viewport(0, 0, this.storage.frame.current_rt.width, this.storage.frame.current_rt.height);
        }
        if (!VSG.config.use_rgba_3d_shadows) {
            gl.colorMask(true, true, true, true);
        }
    }

    init_shader_material(shader_material: ShaderMaterial, vs: string, fs: string, conditions: number[]) {
        if (!vs) vs = spatial_vs;
        if (!fs) fs = spatial_fs;

        let vs_code = vs
            // uniform
            .replace("/* GLOBALS */", `${shader_material.global_code}\n${shader_material.vs_uniform_code}`)
            // shader code
            .replace(/\/\* VERTEX_CODE_BEGIN \*\/([\s\S]*?)\/\* VERTEX_CODE_END \*\//, `{\n${shader_material.vs_code}\n}`)

        let fs_code = fs
            // uniform
            .replace("/* GLOBALS */", `${shader_material.global_code}\n${shader_material.fs_uniform_code}`)
            // shader code
            .replace(/\/\* FRAGMENT_CODE_BEGIN \*\/([\s\S]*?)\/\* FRAGMENT_CODE_END \*\//, `{\n${shader_material.fs_code}\n}`)
        if (shader_material.lt_code) {
            fs_code = fs_code.replace(/\/\* LIGHT_CODE_BEGIN \*\/([\s\S]*?)\/\* LIGHT_CODE_END \*\//, `{\n${shader_material.lt_code}\n}`)
        } else {
            fs_code = fs_code
                .replace("/* LIGHT_CODE_BEGIN */", "")
                .replace("/* LIGHT_CODE_END */", "")
        }

        // detect features
        conditions = conditions.slice();

        const spatial: { [key: string]: number | boolean } = {
            uses_alpha: shader_material.fs_code.includes("ALPHA"),
            uses_alpha_scissor: shader_material.vs_code.includes("ALPHA_SCISSOR") || shader_material.fs_code.includes("ALPHA_SCISSOR") || shader_material.lt_code.includes("ALPHA_SCISSOR"),
            unshaded: shader_material.render_modes.includes("unshaded"),
            no_depth_test: shader_material.render_modes.includes("depth_test_disable"),
            uses_screen_texture: shader_material.fs_code.includes("SCREEN_TEXTURE"),
            uses_depth_texture: shader_material.vs_code.includes("DEPTH_TEXTURE") || shader_material.fs_code.includes("DEPTH_TEXTURE") || shader_material.lt_code.includes("DEPTH_TEXTURE"),
            uses_time: shader_material.vs_code.includes("TIME") || shader_material.fs_code.includes("TIME") || shader_material.lt_code.includes("TIME"),
            uses_tangent: shader_material.vs_code.includes("TANGENT") || shader_material.fs_code.includes("TANGENT") || shader_material.lt_code.includes("TANGENT"),
        };
        if (shader_material.render_modes.length) {
            for (let mode of shader_material.render_modes) {
                switch (mode) {
                    case "blend_mix": {
                        spatial.blend_mode = BLEND_MODE_MIX;
                    } break;
                    case "blend_add": {
                        spatial.blend_mode = BLEND_MODE_ADD;
                    } break;
                    case "blend_sub": {
                        spatial.blend_mode = BLEND_MODE_SUB;
                    } break;
                    case "blend_mul": {
                        spatial.blend_mode = BLEND_MODE_MUL;
                    } break;

                    case "depth_draw_opaque": {
                        spatial.depth_draw_mode = DEPTH_DRAW_OPAQUE;
                    } break;
                    case "depth_draw_always": {
                        spatial.depth_draw_mode = DEPTH_DRAW_ALWAYS;
                    } break;
                    case "depth_draw_never": {
                        spatial.depth_draw_mode = DEPTH_DRAW_NEVER;
                    } break;
                    case "depth_draw_alpha_prepass": {
                        spatial.depth_draw_mode = DEPTH_DRAW_ALPHA_PREPASS;
                    } break;

                    case "cull_front": {
                        spatial.cull_mode = CULL_MODE_FRONT;
                    } break;
                    case "cull_back": {
                        spatial.cull_mode = CULL_MODE_BACK;
                    } break;
                    case "cull_disabled": {
                        spatial.cull_mode = CULL_MODE_DISABLED;
                    } break;

                    case "diffuse_lambert": {
                        // @Incomplete
                        add_to_condition(conditions, "DIFFUSE_LAMBERT_WRAP");
                    } break;
                    case "diffuse_lambert_wrap": {
                        add_to_condition(conditions, "DIFFUSE_LAMBERT_WRAP");
                    } break;
                    case "diffuse_oren_nayar": {
                        add_to_condition(conditions, "DIFFUSE_OREN_NAYAR");
                    } break;
                    case "diffuse_burley": {
                        add_to_condition(conditions, "DIFFUSE_BURLEY");
                    } break;
                    case "diffuse_toon": {
                        add_to_condition(conditions, "DIFFUSE_TOON");
                    } break;

                    case "specular_schlick_ggx": {
                        add_to_condition(conditions, "SPECULAR_SCHLICK_GGX");
                    } break;
                    case "specular_blinn": {
                        add_to_condition(conditions, "SPECULAR_BLINN");
                    } break;
                    case "specular_phong": {
                        add_to_condition(conditions, "SPECULAR_PHONE");
                    } break;
                    case "specular_toon": {
                        add_to_condition(conditions, "SPECULAR_TOON");
                    } break;
                    case "specular_disabled": {
                        // @Incomplete
                        add_to_condition(conditions, "SPECULAR_SCHLICK_GGX");
                    } break;

                    case "vertex_lighting": {
                        // @Incomplete
                        // add_to_condition(conditions, "USE_VERTEX_LIGHTING");
                    } break;
                    case "shadow_to_opacity": {
                        add_to_condition(conditions, "USE_SHADOW_TO_OPACITY");
                    } break;
                }
            }
        }
        if (spatial.uses_screen_texture) {
            add_to_condition(conditions, "SCREEN_TEXTURE_USED");
        }
        if (shader_material.fs_code.includes("SCREEN_UV")) {
            add_to_condition(conditions, "SCREEN_UV_USED");
        }
        if (spatial.uses_depth_texture) {
            add_to_condition(conditions, "DEPTH_TEXTURE_USED");
        }

        let def_code = get_shader_def_code(conditions);
        vs_code = `${def_code}\n${vs_code}`;
        fs_code = `${def_code}\n${fs_code}`;

        const vs_uniforms = parse_uniforms_from_code(vs_code)
            .map(u => ({ type: u.type, name: u.name }))
        const fs_uniforms = parse_uniforms_from_code(fs_code)
            .map(u => ({ type: u.type, name: u.name }))
        const uniforms: { name: string, type: UniformTypes }[] = [];
        for (let u of vs_uniforms) {
            if (!uniforms.find((v) => v.name === u.name)) {
                uniforms.push(u);
            }
        }
        for (let u of fs_uniforms) {
            if (!uniforms.find((v) => v.name === u.name)) {
                uniforms.push(u);
            }
        }

        const shader = VSG.storage.shader_create(
            vs_code,
            fs_code,
            DEFAULT_SPATIAL_ATTRIBS,
            uniforms
        );
        shader.name = shader_material.name;
        Object.assign(shader.spatial, spatial);

        const material = VSG.storage.material_create(shader);
        material.name = shader_material.name;
        material.batchable = false;
        for (let u of shader_material.uniforms) {
            let shader_u = shader.uniforms[u.name];
            if (u.value && shader_u && shader_u.gl_loc) {
                if (Array.isArray(u.value)) {
                    material.params[u.name] = u.value;
                } else {
                    material.textures[u.name] = u.value;
                }
            }
        }
        return material;
    }

    get_shader_with_conditions(material: Material_t, conditions: number[]) {
        return VSG.storage.shader_get_instance_with_defines(material.shader, conditions, get_shader_def_code(conditions));
    }

    /**
     * @param {Material_t} material
     */
    bind_scene_shader(material: Material_t) {
        let shader = this.get_shader_with_conditions(material, this.state.conditions);

        let rebind = !is_condition_equal(this.state.prev_conditions, this.state.conditions)
            ||
            this.state.current_shader !== shader

        if (rebind) {
            this.gl.useProgram(shader.gl_prog);

            this.state.current_shader = shader;
        }

        copy_array_values(this.state.conditions, this.state.prev_conditions);

        return rebind;
    }

    /**
     * @param {WebGLTexture} p_texture
     * @param {WebGLFramebuffer} p_buffer
     */
    _copy_texture_to_buffer(p_texture: WebGLTexture, p_buffer: WebGLFramebuffer) {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, p_buffer);

        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);
        gl.colorMask(true, true, true, true);

        this.bind_texture(0, p_texture);

        gl.viewport(0, 0, this.storage.frame.current_rt.width, this.storage.frame.current_rt.height);

        this.storage.bind_copy_shader();
        this.storage.bind_quad_array();
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    _fill_render_list(p_cull_result: Instance_t[], p_cull_count: number, p_depth_pass: boolean, p_shadow_pass: boolean) {
        this.render_pass++;
        this.current_material_index = 0;
        this.current_geometry_index = 0;
        this.current_light_index = 0;
        this.current_shader_index = 0;

        for (let i = 0; i < p_cull_count; i++) {
            let inst = p_cull_result[i];

            switch (inst.base_type) {
                case INSTANCE_TYPE_MESH: {
                    let mesh: Mesh_t = inst.base as Mesh_t;
                    let num_surfaces = mesh.surfaces.length;
                    for (let j = 0; j < num_surfaces; j++) {
                        let material_idx = inst.materials[j] ? j : -1;
                        let surface = mesh.surfaces[j];
                        this._add_geometry(surface, inst, material_idx, p_depth_pass, p_shadow_pass);
                    }
                } break;
                case INSTANCE_TYPE_MULTIMESH: {
                } break;
                case INSTANCE_TYPE_IMMEDIATE: {
                } break;
            }
        }
    }

    _add_geometry(p_geometry: Geometry_t, p_instance: Instance_t, p_material: number, p_depth_pass: boolean, p_shadow_pass: boolean) {
        let material: Material_t = null;

        if (p_instance.material_override) {
            material = p_instance.material_override;
        } else if (p_material >= 0) {
            material = p_instance.materials[p_material];
        } else {
            material = p_geometry.material;
        }

        if (!material) {
            material = this.default_material.material;
        }

        this._add_geometry_with_material(p_geometry, p_instance, material, p_depth_pass, p_shadow_pass);

        while (material.next_pass) {
            material = material.next_pass;

            if (!material || !material.shader) {
                break;
            }

            this._add_geometry_with_material(p_geometry, p_instance, material, p_depth_pass, p_shadow_pass);
        }
    }

    _add_geometry_with_material(p_geometry: Geometry_t, p_instance: Instance_t, p_material: Material_t, p_depth_pass: boolean, p_shadow_pass: boolean) {
        let has_base_alpha = p_material.shader.spatial.uses_alpha && !p_material.shader.spatial.uses_alpha_scissor;
        let has_blend_alpha = false;
        let has_alpha = has_base_alpha || has_blend_alpha;

        let mirror = p_instance.mirror;

        if (p_material.shader.spatial.uses_screen_texture) {
            this.state.used_screen_texture = true;
        }

        if (p_depth_pass) {
            if (has_blend_alpha || p_material.shader.spatial.uses_depth_texture) {
                return;
            }

            has_alpha = false;
        }

        let e = (has_alpha || p_material.shader.spatial.no_depth_test) ? this.render_list.add_alpha_element() : this.render_list.add_element();

        if (!e) return;

        e.geometry = p_geometry;
        e.material = p_material;
        e.instance = p_instance;
        e.use_accum = false;
        e.light_index = MAX_LIGHTS;
        e.front_facing = false;

        if (e.geometry.last_pass !== this.render_pass) {
            e.geometry.last_pass = this.render_pass;
            e.geometry.index = this.current_geometry_index++;
        }

        e.geometry_index = e.geometry.index;

        if (e.material.last_pass !== this.render_pass) {
            e.material.last_pass = this.render_pass;
            e.material.index = this.current_material_index++;

            if (e.material.shader.last_pass !== this.render_pass) {
                e.material.shader.index = this.current_shader_index;
            }
        }

        e.material_index = e.material.index;

        if (mirror) {
            e.front_facing = true;
        }

        if (!p_depth_pass) {
            e.depth_layer = e.instance.depth_layer;
            e.priority = p_material.render_priority;

            if (has_alpha && p_material.shader.spatial.depth_draw_mode === DEPTH_DRAW_ALPHA_PREPASS) {
                let eo = this.render_list.add_element();
                eo.copy(e);
            }

            // add directional lights

            if (p_material.shader.spatial.unshaded) {
                e.light_mode = LIGHTMODE_UNSHADED;
            } else {
                let copy = false;

                for (let i = 0; i < this.render_directional_lights; i++) {
                    if (copy) {
                        let e2 = has_alpha ? this.render_list.add_alpha_element() : this.render_list.add_element();
                        if (!e2) break;
                        e2.copy(e);
                        e = e2;
                    }

                    // directional sort key
                    e.light_type1 = 0;
                    e.light_type2 = 1;
                    e.light_index = i;

                    copy = true;
                }

                // add omni/spots

                for (let i = 0; i < e.instance.light_instances.length; i++) {
                    let li = e.instance.light_instances[i];

                    if (!li || li.light_index >= this.render_light_instance_count || this.render_light_instances[li.light_index] !== li) {
                        continue;
                    }

                    if (copy) {
                        let e2 = has_alpha ? this.render_list.add_alpha_element() : this.render_list.add_element();
                        if (!e2) {
                            break;
                        }
                        e2.copy(e);
                        e = e2;
                    }

                    // directional sort key
                    e.light_type1 = 1;
                    e.light_type2 = li.light.type === LIGHT_OMNI ? 0 : 1;
                    e.light_index = li.light_index;

                    copy = true;
                }

                if (e.instance.lightmap) {
                    e.light_mode = LIGHTMODE_LIGHTMAP;
                } else {
                    e.light_mode = LIGHTMODE_NORMAL;
                }
            }
        }
    }

    _render_render_list(p_elements: Element_t[], p_element_start: number, p_element_count: number, p_view_transform: Transform, p_projection: CameraMatrix, p_shadow_atlas: ShadowAtlas_t, p_env: Environment_t, p_shadow_bias: number, p_shadow_normal_bias: number, p_reverse_cull: boolean, p_alpha_pass: boolean, p_shadow: boolean) {
        const gl = this.gl;

        let prev_unshaded = false;
        let prev_instancing = false;
        let prev_depth_prepass = false;
        this.set_shader_condition("SHADELESS", false);
        let prev_material: Material_t = null;
        let prev_geometry: Geometry_t = null;
        let prev_skeleton: Skeleton_t = null;

        const view_transform_inverse = _i_render_render_list_Transform_1.copy(p_view_transform).invert();
        const projection_inverse = _i_render_render_list_CameraMatrix_1.copy(p_projection).invert();

        let prev_base_pass = false;
        let prev_light: LightInstance_t = null;
        let prev_vertex_lit = false;

        let prev_blend_mode = -2;

        this.state.gl.CULL_FRONT = false;
        this.state.gl.CULL_FACE = true;
        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);

        if (p_alpha_pass) {
            this.state.gl.BLEND = true;
            gl.enable(gl.BLEND);
        } else {
            this.state.gl.BLEND = false;
            gl.disable(gl.BLEND);
        }

        let fog_max_distance = 0;
        let using_fog = false;
        if (p_env && !p_shadow && !!p_env.fog_enabled[0] && (!!p_env.fog_depth_enabled[0] || !!p_env.fog_height_enabled[0])) {
            this.set_shader_condition("FOG_DEPTH_ENABLED", p_env.fog_depth_enabled[0] > 0);
            this.set_shader_condition("FOG_HEIGHT_ENABLED", p_env.fog_height_enabled[0] > 0);
            if (p_env.fog_depth_end[0] > 0) {
                fog_max_distance = p_env.fog_depth_end[0];
            } else {
                fog_max_distance = p_projection.get_z_far();
            }
            using_fog = true;
        }

        let prev_lightmap: Texture_t = null;
        let lightmap_energy = 1.0;

        mark_uniforms_outdated(this.state.uniform_states);
        mark_textures_outdated(this.state.texture_states);

        for (let i = 0; i < p_element_count; i++) {
            let e = p_elements[i + p_element_start];

            let material = e.material;
            let uniform_states = this.state.uniform_states;

            let rebind = false;
            let accum_pass = e.use_accum;
            e.use_accum = true;
            let light: LightInstance_t = null;
            let lightmap: Texture_t = null;
            let rebind_light = false;
            let rebind_lightmap = false;

            if (!p_shadow && material.shader) {
                let unshaded = material.shader.spatial.unshaded;

                if (unshaded !== prev_unshaded) {
                    rebind = true;
                    if (unshaded) {
                        this.set_shader_condition("SHADELESS", true);
                        this.set_shader_condition("USE_LIGHTING", false);
                    } else {
                        this.set_shader_condition("SHADELESS", false);
                    }
                    prev_unshaded = unshaded;
                }

                let base_pass = !accum_pass && !unshaded;

                if (base_pass !== prev_base_pass) {
                    this.set_shader_condition("BASE_PASS", base_pass);
                    rebind = true;
                    prev_base_pass = base_pass;
                }

                if (!unshaded && e.light_index < MAX_LIGHTS) {
                    light = this.render_light_instances[e.light_index];
                    // @Incomplete: do not use light if it is in BAKE_ALL mode
                }

                if (light != prev_light) {
                    this._setup_light_type(light, p_shadow_atlas);
                    rebind = true;
                    rebind_light = true;
                }

                let blend_mode = p_alpha_pass ? material.shader.spatial.blend_mode : -1; // -1 no blend, no mix

                if (accum_pass) {
                    blend_mode = BLEND_MODE_ADD;
                    if (light && light.light.negative) {
                        blend_mode = BLEND_MODE_SUB;
                    }
                }

                if (prev_blend_mode !== blend_mode) {
                    if (prev_blend_mode === -1 && blend_mode !== -1) {
                        if (!this.state.gl.BLEND) {
                            this.state.gl.BLEND = true;
                            gl.enable(gl.BLEND);
                        }
                    } else if (blend_mode === -1 && prev_blend_mode !== -1) {
                        if (this.state.gl.BLEND) {
                            this.state.gl.BLEND = false;
                            gl.disable(gl.BLEND);
                        }
                    }

                    switch (blend_mode) {
                        case BLEND_MODE_MIX: {
                            gl.blendEquation(gl.FUNC_ADD);
                            if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.TRANSPARENT) {
                                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                            } else {
                                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                            }
                        } break;
                        case BLEND_MODE_ADD: {
                            gl.blendEquation(gl.FUNC_ADD);
                            gl.blendFunc(p_alpha_pass ? gl.SRC_ALPHA : gl.ONE, gl.ONE);
                        } break;
                        case BLEND_MODE_SUB: {
                            gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
                            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                        } break;
                        case BLEND_MODE_MUL: {
                            gl.blendEquation(gl.FUNC_ADD);
                            if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.TRANSPARENT) {
                                gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.DST_ALPHA, gl.ZERO);
                            } else {
                                gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.ZERO, gl.ONE);
                            }
                        } break;
                    }

                    prev_blend_mode = blend_mode;
                }

                // @Incomplete: vertex light

                if (!unshaded && !accum_pass && e.instance.lightmap) {
                    lightmap = e.instance.lightmap;
                    lightmap_energy = 1.0;
                    if (lightmap) {
                        let capture: LightmapCapture_t = e.instance.lightmap_capture.base as LightmapCapture_t;
                        if (capture) {
                            lightmap_energy = capture.energy;
                        }
                    }
                }

                if (lightmap != prev_lightmap) {
                    this.set_shader_condition("USE_LIGHTMAP", !!lightmap);

                    rebind = true;
                    rebind_lightmap = true;
                }
            }

            let depth_prepass = false;

            if (!p_alpha_pass && material.shader.spatial.depth_draw_mode === DEPTH_DRAW_ALPHA_PREPASS) {
                depth_prepass = true;
            }

            if (depth_prepass !== prev_depth_prepass) {
                this.set_shader_condition("USE_DEPTH_PREPASS", depth_prepass);
                prev_depth_prepass = depth_prepass;
                rebind = true;
            }

            let instancing = e.instance.base_type === INSTANCE_TYPE_MULTIMESH;

            if (instancing != prev_instancing) {
                this.set_shader_condition("USE_INSTANCING", instancing);
                rebind = true;
            }

            let skeleton = e.instance.skeleton;

            if (skeleton != prev_skeleton) {
                if ((!prev_skeleton) !== (!skeleton)) {
                    if (skeleton) {
                        this.set_shader_condition("USE_SKELETON", true);
                        this.set_shader_condition("USE_SKELETON_SOFTWARE", VSG.config.use_skeleton_software);
                    } else {
                        this.set_shader_condition("USE_SKELETON", false);
                        this.set_shader_condition("USE_SKELETON_SOFTWARE", false);
                    }
                }
                rebind = true;
            }

            if (e.geometry != prev_geometry || skeleton != prev_skeleton) {
                this._setup_geometry(e, skeleton);
            }

            let shader_rebind = false;
            if (rebind || material != prev_material) {
                shader_rebind = this._setup_material(material, p_alpha_pass, skeleton ? skeleton.size * 3 : 0);
            }

            if (shader_rebind) {
                mark_uniforms_outdated(this.state.uniform_states);
                mark_textures_outdated(this.state.texture_states);
            }

            if (rebind_lightmap) {
                if (lightmap) {
                    this.bind_texture(VSG.config.max_texture_image_units - 4, lightmap.gl_tex);
                    this.set_uniform_n("lightmap", VSG.config.max_texture_image_units - 4);
                }
            }

            this._set_cull(e.front_facing, material.shader.spatial.cull_mode === CULL_MODE_DISABLED, p_reverse_cull);

            if (i === 0 || shader_rebind) {
                if (p_shadow) {
                    this.set_uniform_n("light_bias", p_shadow_bias, true, true);
                    this.set_uniform_n("light_normal_bias", p_shadow_normal_bias, true, true);
                    if (this.state.shadow_is_dual_paraboloid) {
                        this.set_uniform_n("shadow_dual_paraboloid_render_side", this.state.dual_parboloid_direction, true, true);
                        this.set_uniform_n("shadow_dual_paraboloid_render_zfar", this.state.dual_parboloid_zfar, true, true);
                    }
                } else {
                    if (p_env) {
                        this.set_uniform_v("bg_energy", p_env.bg_energy, true, true);
                        this.set_uniform_v("bg_color", p_env.bg_color, true, true);
                        this.set_uniform_v("ambient_color", p_env.ambient_color, true, true);
                        this.set_uniform_v("ambient_energy", p_env.ambient_energy, true, true);
                    } else {
                        this.set_uniform_n("bg_energy", 1.0, true, true);
                        this.set_uniform_v("bg_color", this.state.default_bg.as_array(), true, true);
                        this.set_uniform_v("ambient_color", this.state.default_ambient.as_array(), true, true);
                        this.set_uniform_n("ambient_energy", 1.0, true, true);
                    }

                    rebind_light = true;
                    rebind_lightmap = true;

                    if (using_fog) {
                        this.set_uniform_v("fog_color_base", p_env.fog_color, true, true);
                        this.set_uniform_n4(
                            "fog_sun_color_amount",
                            p_env.fog_sun_color[0],
                            p_env.fog_sun_color[1],
                            p_env.fog_sun_color[2],
                            p_env.fog_sun_amount[0],
                            true, true
                        );

                        this.set_uniform_v("fog_transmit_enabled", p_env.fog_transmit_enabled, true, true);
                        this.set_uniform_v("fog_transmit_curve", p_env.fog_transmit_curve, true, true);

                        if (p_env.fog_depth_enabled[0]) {
                            this.set_uniform_v("fog_depth_begin", p_env.fog_depth_begin, true, true);
                            this.set_uniform_v("fog_depth_curve", p_env.fog_depth_curve, true, true);
                            this.set_uniform_n("fog_max_distance", fog_max_distance, true, true);
                        }

                        if (p_env.fog_height_enabled[0]) {
                            this.set_uniform_v("fog_height_min", p_env.fog_height_min, true, true);
                            this.set_uniform_v("fog_height_max", p_env.fog_height_max, true, true);
                            this.set_uniform_v("fog_height_curve", p_env.fog_height_curve, true, true);
                        }
                    }
                }

                this.set_uniform_v("CAMERA_MATRIX", p_view_transform.as_array(), true, true);
                this.set_uniform_v("INV_CAMERA_MATRIX", view_transform_inverse.as_array(), true, true);
                this.set_uniform_v("PROJECTION_MATRIX", p_projection.as_array(), true, true);
                this.set_uniform_v("INV_PROJECTION_MATRIX", projection_inverse.as_array(), true, true);

                this.set_uniform_v("TIME", this.storage.frame.time, true, true);
                this.set_uniform_v("VIEWPORT_SIZE", this.state.viewport_size.as_array(), true, true);
                this.set_uniform_v("SCREEN_PIXEL_SIZE", this.state.screen_pixel_size.as_array(), true, true);
            }

            if (rebind_light && light) {
                this._setup_light(light, p_shadow_atlas, p_view_transform, accum_pass);
            }

            if (rebind_lightmap && lightmap) {
                this.set_uniform_n("lightmap_energy", lightmap_energy, true, true);
            }

            this.set_uniform_v("world_transform", e.instance.transform.as_array(), true, true);

            let mat_uniforms = this.state.current_shader.uniforms;
            for (let name in mat_uniforms) {
                let u = mat_uniforms[name];

                // uniform not exist in the shader
                if (!u.gl_loc) continue;

                let state = uniform_states[name];
                // this uniform not recorded yet?
                if (!state) {
                    state = uniform_states[name] = {
                        value: material.params[name].slice(),
                        force_locked: false,
                        changed: true,
                    };
                }

                // no need to upload if it"s not changed yet
                if (!state.changed) continue;

                switch (u.type) {
                    case "1i": gl.uniform1i(u.gl_loc, state.value[0]); break;
                    case "2i": gl.uniform2iv(u.gl_loc, state.value); break;
                    case "1f": gl.uniform1f(u.gl_loc, state.value[0]); break;
                    case "2f": gl.uniform2fv(u.gl_loc, state.value); break;
                    case "3f": gl.uniform3fv(u.gl_loc, state.value); break;
                    case "4f": gl.uniform4fv(u.gl_loc, state.value); break;
                    case "mat3": gl.uniformMatrix3fv(u.gl_loc, false, state.value); break;
                    case "mat4": gl.uniformMatrix4fv(u.gl_loc, false, state.value); break;
                }

                // now it"s synced with GPU
                state.changed = false;
            }

            this._render_geometry(e);

            prev_geometry = e.geometry;
            prev_material = e.material;
            prev_skeleton = skeleton;
            prev_instancing = instancing;
            prev_light = light;
            prev_lightmap = lightmap;
        }

        if (VSG.config.vao) {
            const gl_ext = OS.get_singleton().gl_ext;
            gl_ext.bindVertexArray(null);
        }

        this._setup_light_type(null, null);
        this.set_shader_condition("USE_SKELETON", false);
        this.set_shader_condition("SHADELESS", false);
        this.set_shader_condition("BASE_PASS", false);
        this.set_shader_condition("USE_INSTANCING", false);
        this.set_shader_condition("LIGHT_USE_PSSM4", false);
        this.set_shader_condition("LIGHT_USE_PSSM2", false);
        this.set_shader_condition("LIGHT_USE_PSSM_BLEND", false);
        this.set_shader_condition("USE_LIGHTMAP", false);
        this.set_shader_condition("FOG_DEPTH_ENABLED", false);
        this.set_shader_condition("FOG_HEIGHT_ENABLED", false);
        this.set_shader_condition("USE_DEPTH_PREPASS", false);

        this.set_shader_condition("ENABLE_UV_INTERP", false);
    }

    /**
     * @param {Sky_t} p_sky
     * @param {CameraMatrix} p_projection
     * @param {Transform} p_transform
     * @param {boolean} p_vflip
     * @param {number} p_custom_fov
     * @param {number} p_energy
     * @param {Basis} p_sky_orientation
     */
    _draw_sky(p_sky: Sky_t, p_projection: CameraMatrix, p_transform: Transform, p_vflip: boolean, p_custom_fov: number, p_energy: number, p_sky_orientation: Basis) {
        const gl = this.gl;

        if (!this.state.gl.depthMask) {
            gl.depthMask(true);
            this.state.gl.depthMask = true;
        }
        if (!this.state.gl.DEPTH_TEST) {
            gl.enable(gl.DEPTH_TEST);
            this.state.gl.DEPTH_TEST = true;
        }
        if (this.state.gl.CULL_FACE) {
            gl.disable(gl.CULL_FACE);
            this.state.gl.CULL_FACE = false;
        }
        if (this.state.gl.BLEND) {
            gl.disable(gl.BLEND);
            this.state.gl.BLEND = false;
        }
        if (this.state.gl.depthFunc !== gl.LEQUAL) {
            gl.depthFunc(gl.LEQUAL);
            this.state.gl.depthFunc = gl.LEQUAL;
        }

        const camera = _i_draw_sky_CameraMatrix_1.identity();

        if (p_custom_fov) {
            let near_plane = p_projection.get_z_near();
            let far_plane = p_projection.get_z_far();
            let aspect = p_projection.get_aspect();

            camera.set_perspective(p_custom_fov, aspect, near_plane, far_plane);
        } else {
            camera.copy(p_projection);
        }

        let flip_sign = p_vflip ? -1 : 1;

        sky_vertices[0] = -1;
        sky_vertices[1] = -flip_sign;
        sky_vertices[2] = 1;

        sky_vertices[3] = 0;
        sky_vertices[4] = 1;
        sky_vertices[5] = 0;

        sky_vertices[6] = 1;
        sky_vertices[7] = -flip_sign;
        sky_vertices[8] = 1;

        sky_vertices[9] = 1;
        sky_vertices[10] = 1;
        sky_vertices[11] = 0;

        sky_vertices[12] = 1;
        sky_vertices[13] = flip_sign;
        sky_vertices[14] = 1;

        sky_vertices[15] = 1;
        sky_vertices[16] = 0;
        sky_vertices[17] = 0;

        sky_vertices[18] = -1;
        sky_vertices[19] = flip_sign;
        sky_vertices[20] = 1;

        sky_vertices[21] = 0;
        sky_vertices[22] = 0;
        sky_vertices[23] = 0;

        let vp_he = camera.get_viewport_half_extents();
        let zn = p_projection.get_z_near();

        const uv = _i_draw_sky_Vector3_1;
        for (let i = 0; i < 4; i++) {
            let idx = (i * 2 + 1) * 3;

            uv.set(
                sky_vertices[idx + 0],
                sky_vertices[idx + 1],
                sky_vertices[idx + 2]
            );

            uv.x = (uv.x * 2 - 1) * vp_he.x;
            uv.y = -(uv.y * 2 - 1) * vp_he.y;
            uv.z = -zn;

            p_transform.basis.xform(uv, uv).normalize();
            uv.z = -uv.z;

            sky_vertices[idx + 0] = uv.x;
            sky_vertices[idx + 1] = uv.y;
            sky_vertices[idx + 2] = uv.z;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.state.sky_verts);
        gl.bufferData(gl.ARRAY_BUFFER, sky_vertices, gl.DYNAMIC_DRAW);

        gl.vertexAttribPointer(ARRAY_VERTEX, 3, gl.FLOAT, false, 3 * 2 * 4, 0);
        gl.vertexAttribPointer(ARRAY_TEX_UV, 3, gl.FLOAT, false, 3 * 2 * 4, 3 * 4);
        gl.enableVertexAttribArray(ARRAY_VERTEX);
        gl.enableVertexAttribArray(ARRAY_TEX_UV);

        let copy = this.storage.shaders.copy;
        copy.set_conditional("USE_PANORAMA", true);
        copy.set_conditional("USE_MULTIPLIER", true);
        copy.set_conditional("USE_CUBEMAP", false);
        copy.set_conditional("USE_COPY_SECTION", false);
        copy.set_conditional("USE_CUSTOM_ALPHA", false);
        copy.bind();

        // set uniforms
        copy.set_uniform_float("multiplier", p_energy);

        const t = _i_draw_sky_Transform_1.identity();
        t.basis.copy(p_sky_orientation);
        t.affine_invert();
        copy.set_uniform("sky_transform", t.as_array(sky_transform_arr))

        // set textures
        let tex = p_sky.panorama;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(tex.target, tex.gl_tex);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        gl.disableVertexAttribArray(ARRAY_VERTEX);
        gl.disableVertexAttribArray(ARRAY_TEX_UV);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        copy.set_conditional("USE_PANORAMA", false);
        copy.set_conditional("USE_MULTIPLIER", false);
        copy.set_conditional("USE_CUBEMAP", false);
    }

    /**
     * @param {boolean} p_front
     * @param {boolean} p_disabled
     * @param {boolean} p_reverse_cull
     */
    _set_cull(p_front: boolean, p_disabled: boolean, p_reverse_cull: boolean) {
        const gl = this.gl;

        let front = p_front;
        if (p_reverse_cull) {
            front = !front;
        }

        if (p_disabled !== this.state.gl.CULL_FACE) {
            if (p_disabled) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }

            this.state.gl.CULL_FACE = p_disabled;
        }

        if (front !== this.state.gl.CULL_FRONT) {
            gl.cullFace(front ? gl.FRONT : gl.BACK);
            this.state.gl.CULL_FRONT = front;
        }
    }

    _setup_light_type(p_light: LightInstance_t, shadow_atlas: ShadowAtlas_t) {
        this.set_shader_condition("USE_LIGHTING", false);
        this.set_shader_condition("USE_SHADOW", false);
        this.set_shader_condition("SHADOW_MODE_PCF_5", false);
        this.set_shader_condition("SHADOW_MODE_PCF_13", false);
        this.set_shader_condition("LIGHT_MODE_DIRECTIONAL", false);
        this.set_shader_condition("LIGHT_MODE_OMNI", false);
        this.set_shader_condition("LIGHT_MODE_SPOT", false);
        this.set_shader_condition("LIGHT_USE_PSSM2", false);
        this.set_shader_condition("LIGHT_USE_PSSM4", false);
        this.set_shader_condition("LIGHT_USE_PSSM_BLEND", false);

        if (!p_light) {
            return;
        }

        this.set_shader_condition("USE_LIGHTING", true);

        switch (p_light.light.type) {
            case LIGHT_DIRECTIONAL: {
                this.set_shader_condition("LIGHT_MODE_DIRECTIONAL", true);

                switch (p_light.light.directional_shadow_mode) {
                    case LIGHT_DIRECTIONAL_SHADOW_ORTHOGONAL: {
                    } break;
                    case LIGHT_DIRECTIONAL_SHADOW_PARALLEL_2_SPLITS: {
                        this.set_shader_condition("LIGHT_USE_PSSM2", true);
                    } break;
                    case LIGHT_DIRECTIONAL_SHADOW_PARALLEL_4_SPLITS: {
                        this.set_shader_condition("LIGHT_USE_PSSM4", true);
                    } break;
                }

                this.set_shader_condition("LIGHT_USE_PSSM_BLEND", p_light.light.directional_blend_splits);

                if (!this.state.render_no_shadows && p_light.light.shadow) {

                    this.set_shader_condition("USE_SHADOW", true);
                    if (VSG.config.use_rgba_3d_shadows) {
                        this.bind_texture(VSG.config.max_texture_image_units - 3, this.directional_shadow.gl_color);
                    } else {
                        this.bind_texture(VSG.config.max_texture_image_units - 3, this.directional_shadow.gl_depth);
                    }
                    this.set_uniform_n("light_directional_shadow", VSG.config.max_texture_image_units - 3);

                    this.set_shader_condition("SHADOW_MODE_PCF_5", this.shadow_filter_mode === SHADOW_FILTER_PCF5);
                    this.set_shader_condition("SHADOW_MODE_PCF_13", this.shadow_filter_mode === SHADOW_FILTER_PCF13);
                }
            } break;
            case LIGHT_OMNI: {
                this.set_shader_condition("LIGHT_MODE_OMNI", true);

                if (!this.state.render_no_shadows && shadow_atlas && p_light.light.shadow) {
                    this.set_shader_condition("USE_SHADOW", true);
                    if (VSG.config.use_rgba_3d_shadows) {
                        this.bind_texture(VSG.config.max_texture_image_units - 3, shadow_atlas.gl_color);
                    } else {
                        this.bind_texture(VSG.config.max_texture_image_units - 3, shadow_atlas.gl_depth);
                    }
                    this.set_uniform_n("light_shadow_atlas", VSG.config.max_texture_image_units - 3);

                    this.set_shader_condition("SHADOW_MODE_PCF_5", this.shadow_filter_mode === SHADOW_FILTER_PCF5);
                    this.set_shader_condition("SHADOW_MODE_PCF_13", this.shadow_filter_mode === SHADOW_FILTER_PCF13);
                }
            } break;
            case LIGHT_SPOT: {
                this.set_shader_condition("LIGHT_MODE_SPOT", true);

                if (!this.state.render_no_shadows && shadow_atlas && p_light.light.shadow) {
                    this.set_shader_condition("USE_SHADOW", true);
                    if (VSG.config.use_rgba_3d_shadows) {
                        this.bind_texture(VSG.config.max_texture_image_units - 3, shadow_atlas.gl_color);
                    } else {
                        this.bind_texture(VSG.config.max_texture_image_units - 3, shadow_atlas.gl_depth);
                    }
                    this.set_uniform_n("light_shadow_atlas", VSG.config.max_texture_image_units - 3);

                    this.set_shader_condition("SHADOW_MODE_PCF_5", this.shadow_filter_mode === SHADOW_FILTER_PCF5);
                    this.set_shader_condition("SHADOW_MODE_PCF_13", this.shadow_filter_mode === SHADOW_FILTER_PCF13);
                }
            } break;
        }
    }

    /**
     * @param {LightInstance_t} p_light
     * @param {ShadowAtlas_t} shadow_atlas
     * @param {Transform} p_view_transform
     * @param {boolean} accum_pass
     */
    _setup_light(p_light: LightInstance_t, shadow_atlas: ShadowAtlas_t, p_view_transform: Transform, accum_pass: boolean) {
        let light = p_light.light;

        // common parameters
        let energy = light.param[LIGHT_PARAM_ENERGY];
        let specular = light.param[LIGHT_PARAM_SPECULAR];
        let sign = (light.negative && !accum_pass) ? -1 : 1;

        this.set_uniform_n("LIGHT_SPECULAR", specular, true, true);

        let light_color = light.color.as_array();
        let sign_energy_PI = sign * energy * Math.PI;
        this.set_uniform_n4("LIGHT_COLOR",
            light_color[0] * sign_energy_PI,
            light_color[1] * sign_energy_PI,
            light_color[2] * sign_energy_PI,
            light_color[3] * sign_energy_PI,
            true, true
        );

        this.set_uniform_v("shadow_color", light.shadow_color.as_array(), true, true);

        // specific parameters
        switch (light.type) {
            case LIGHT_DIRECTIONAL: {
                const direction = _i_setup_light_Vector3_1.set(0, 0, -1);
                p_light.transform.basis.xform(direction, direction);
                p_view_transform.basis.xform_inv(direction, direction);
                direction.normalize();

                this.set_uniform_v("LIGHT_DIRECTION", direction.as_array(), true, true);

                if (!this.state.render_no_shadows && light.shadow && this.directional_shadow.gl_depth) {
                    let shadow_count = 0;
                    let split_offsets = this.get_uniform_v("light_split_offsets");

                    switch (light.directional_shadow_mode) {
                        case LIGHT_DIRECTIONAL_SHADOW_ORTHOGONAL: {
                            shadow_count = 1;
                        } break;
                        case LIGHT_DIRECTIONAL_SHADOW_PARALLEL_2_SPLITS: {
                            shadow_count = 2;
                        } break;
                        case LIGHT_DIRECTIONAL_SHADOW_PARALLEL_4_SPLITS: {
                            shadow_count = 4;
                        } break;
                    }

                    let matrices = [
                        _i_setup_light_CameraMatrix_1.identity(),
                        _i_setup_light_CameraMatrix_2.identity(),
                        _i_setup_light_CameraMatrix_3.identity(),
                        _i_setup_light_CameraMatrix_4.identity(),
                    ];

                    for (let k = 0; k < shadow_count; k++) {
                        let x = p_light.directional_rect.x | 0;
                        let y = p_light.directional_rect.x | 0;
                        let width = p_light.directional_rect.width | 0;
                        let height = p_light.directional_rect.height | 0;

                        if (light.directional_shadow_mode === LIGHT_DIRECTIONAL_SHADOW_PARALLEL_4_SPLITS) {
                            width = (width / 2) | 0;
                            height = (height / 2) | 0;

                            switch (k) {
                                case 1: x += width; break;
                                case 2: y += height; break;
                                case 3: {
                                    x += width;
                                    y += height;
                                } break;
                            }
                        } else if (light.directional_shadow_mode === LIGHT_DIRECTIONAL_SHADOW_PARALLEL_2_SPLITS) {
                            height = (height / 2) | 0;

                            if (k !== 0) {
                                y += height;
                            }
                        }

                        split_offsets[k] = p_light.shadow_transforms[k].split;

                        const _modelview = _i_setup_light_Transform_1.copy(p_view_transform).invert()
                            .append(p_light.shadow_transforms[k].transform)
                            .affine_invert()
                        const modelview = _i_setup_light_CameraMatrix_5.set_transform(_modelview);

                        const bias = _i_setup_light_CameraMatrix_6.identity();
                        bias.set_light_bias();
                        const rectm = _i_setup_light_CameraMatrix_7.identity();
                        const atlas_rect = _i_setup_light_Rect2.set(
                            x / this.directional_shadow.size,
                            y / this.directional_shadow.size,
                            width / this.directional_shadow.size,
                            height / this.directional_shadow.size
                        );
                        rectm.set_light_atlas_rect(atlas_rect);

                        matrices[k].copy(rectm)
                            .append(bias)
                            .append(p_light.shadow_transforms[k].camera)
                            .append(modelview)
                    }

                    this.set_uniform_n2("shadow_pixel_size", 1 / this.directional_shadow.size, 1 / this.directional_shadow.size, true, true);
                    this.set_uniform_v("light_shadow_matrix", matrices[0].as_array(), true, true);
                    this.set_uniform_v("light_shadow_matrix2", matrices[1].as_array(), true, true);
                    this.set_uniform_v("light_shadow_matrix3", matrices[2].as_array(), true, true);
                    this.set_uniform_v("light_shadow_matrix4", matrices[3].as_array(), true, true);
                    this.set_uniform_v("light_split_offsets", split_offsets, true, true);
                }
            } break;
            case LIGHT_OMNI: {
                const position = p_view_transform.xform_inv(p_light.transform.origin, _i_setup_light_Vector3_2);

                this.set_uniform_v("LIGHT_POSITION", position.as_array(), true, true);

                this.set_uniform_n("light_range", light.param[LIGHT_PARAM_RANGE], true, true);
                this.set_uniform_n("LIGHT_ATTENUATION", light.param[LIGHT_PARAM_ATTENUATION], true, true);

                if (!this.state.render_no_shadows && light.shadow && shadow_atlas && shadow_atlas.shadow_owners.has(p_light)) {
                    let key = shadow_atlas.shadow_owners.get(p_light);

                    let quadrant = (key >> QUADRANT_SHIFT) & 0x03;
                    let shadow = key & SHADOW_INDEX_MASK;

                    let atlas_size = shadow_atlas.size;
                    let quadrant_size = atlas_size >> 1;

                    let x = (quadrant & 1) * quadrant_size;
                    let y = (quadrant >> 1) * quadrant_size;

                    let shadow_size = (quadrant_size / shadow_atlas.quadrants[quadrant].subdivision);
                    x += Math.floor(shadow % shadow_atlas.quadrants[quadrant].subdivision) * shadow_size;
                    y += Math.floor(shadow / shadow_atlas.quadrants[quadrant].subdivision) * shadow_size;

                    let width = shadow_size;
                    let height = shadow_size;

                    if (light.omni_shadow_detail === LIGHT_OMNI_SHADOW_DETAIL_HORIZONTAL) {
                        height /= 2;
                    } else {
                        width /= 2;
                    }

                    const proj = _i_setup_light_Transform_2.copy(p_view_transform).invert().append(p_light.transform).invert();

                    this.set_uniform_n2("shadow_pixel_size", 1 / shadow_atlas.size, 1 / shadow_atlas.size, true, true);
                    this.set_uniform_v("light_shadow_matrix", proj.as_array(), true, true);
                    this.set_uniform_n4(
                        "light_clamp",
                        x / atlas_size,
                        y / atlas_size,
                        width / atlas_size,
                        height / atlas_size,
                        true, true
                    );
                    // this.set_uniform_f4("light_clamp", 0, 0, 0.5, 0.25, true, true);
                }
            } break;
            case LIGHT_SPOT: {
                const position = p_view_transform.xform_inv(p_light.transform.origin, _i_setup_light_Vector3_3);

                this.set_uniform_v("LIGHT_POSITION", position.as_array(), true, true);

                const direction = _i_setup_light_Transform_3.copy(p_view_transform).invert()
                    .basis.xform(p_light.transform.basis.xform(_i_setup_light_Vector3_4.set(0, 0, -1), _i_setup_light_Vector3_4))
                    .normalize()
                this.set_uniform_v("LIGHT_DIRECTION", direction.as_array(), true, true);

                let attenuation = light.param[LIGHT_PARAM_ATTENUATION];
                let range = light.param[LIGHT_PARAM_RANGE];
                let spot_attenuation = light.param[LIGHT_PARAM_SPOT_ATTENUATION];
                let angle = light.param[LIGHT_PARAM_SPOT_ANGLE];
                angle = Math.cos(deg2rad(angle));
                this.set_uniform_n("LIGHT_ATTENUATION", attenuation, true, true);
                this.set_uniform_n("LIGHT_SPOT_ATTENUATION", spot_attenuation, true, true);
                this.set_uniform_n("LIGHT_SPOT_RANGE", spot_attenuation, true, true);
                this.set_uniform_n("LIGHT_SPOT_ANGLE", angle, true, true);
                this.set_uniform_n("light_range", range, true, true);

                if (!this.state.render_no_shadows && light.shadow && shadow_atlas && shadow_atlas.shadow_owners.has(p_light)) {
                    // @Incomplete: GLES2 spot shadow not work in Godot 3.2, maybe there"s a bug
                }
            } break;
        }
    }

    _setup_geometry(p_element: Element_t, p_skeleton: Skeleton_t) {
        const gl = this.gl;
        const gl_ext = OS.get_singleton().gl_ext;

        switch (p_element.instance.base_type) {
            case INSTANCE_TYPE_MESH: {
                let s: Surface_t = p_element.geometry as Surface_t;

                if (VSG.config.vao) {
                    gl_ext.bindVertexArray(s.vao_id);
                } else {
                    gl.bindBuffer(gl.ARRAY_BUFFER, s.vertex_id);

                    if (s.index_array_len > 0) {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.index_id);
                    }

                    for (let i = 0; i < ARRAY_MAX; i++) {
                        let attr = s.attribs[i];
                        if (attr.enabled) {
                            gl.enableVertexAttribArray(attr.index);
                            gl.vertexAttribPointer(attr.index, attr.size, attr.type, attr.normalized, attr.stride, attr.offset);
                        } else {
                            gl.disableVertexAttribArray(attr.index);
                            switch (attr.index) {
                                case ARRAY_NORMAL: {
                                    gl.vertexAttrib4f(ARRAY_NORMAL, 0.0, 0.0, 1.0, 1.0);
                                } break;
                                case ARRAY_COLOR: {
                                    gl.vertexAttrib4f(ARRAY_COLOR, 1.0, 1.0, 1.0, 1.0);
                                } break;
                            }
                        }
                    }
                }

                let clear_skeleton_buffer = VSG.config.use_skeleton_software;

                if (p_skeleton) {
                    if (!VSG.config.use_skeleton_software) {
                        this.bind_texture(VSG.config.max_texture_image_units - 1, p_skeleton.gl_tex);
                        this.set_uniform_n("bone_transforms", VSG.config.max_texture_image_units - 1, true, true);
                    } else {
                        // let buffer = this.storage.resources.skeleton_transform_buffer;

                        // if (!s.attribs[ARRAY_BONES].enabled || !s.attribs[ARRAY_WEIGHTS].enabled) {
                        //     break;
                        // }

                        // let size = s.array_len * 12;

                        // let bones_offset = s.attribs[ARRAY_BONES].offset;
                        // let bones_stride = s.attribs[ARRAY_BONES].stride;
                        // let bones_weight_offset = s.attribs[ARRAY_WEIGHTS].offset;
                        // let bones_weight_stride = s.attribs[ARRAY_WEIGHTS].stride;

                        // {
                        //     for (let i = 0; i < s.array_len; i++) {

                        //     }
                        // }
                    }
                }

                if (clear_skeleton_buffer) {
                    gl.disableVertexAttribArray(INSTANCE_BONE_BASE + 0);
                    gl.disableVertexAttribArray(INSTANCE_BONE_BASE + 1);
                    gl.disableVertexAttribArray(INSTANCE_BONE_BASE + 2);
                }
            } break;
            case INSTANCE_TYPE_MULTIMESH: {
            } break;
            case INSTANCE_TYPE_IMMEDIATE: {
            } break;
        }
    }

    _setup_material(p_material: Material_t, p_alpha_pass: boolean, p_skeleton_tex_size: number = 0) {
        const gl = this.gl;

        let shader_rebind = this.bind_scene_shader(p_material);

        let shader = this.state.current_shader;

        if (shader.spatial.uses_screen_texture && this.storage.frame.current_rt) {
            this.bind_texture(VSG.config.max_texture_image_units - 4, this.storage.frame.current_rt.copy_screen_effect.gl_color);
            this.set_uniform_n("SCREEN_TEXTURE", VSG.config.max_texture_image_units - 4, true, true);
        }

        if (shader.spatial.uses_depth_texture && this.storage.frame.current_rt) {
            this.bind_texture(VSG.config.max_texture_image_units - 4, this.storage.frame.current_rt.copy_screen_effect.gl_depth);
            this.set_uniform_n("DEPTH_TEXTURE", VSG.config.max_texture_image_units - 4, true, true);
        }

        if (shader.spatial.no_depth_test || shader.spatial.uses_depth_texture) {
            if (this.state.gl.DEPTH_TEST) {
                gl.disable(gl.DEPTH_TEST);
                this.state.gl.DEPTH_TEST = false;
            }
        } else {
            if (!this.state.gl.DEPTH_TEST) {
                gl.enable(gl.DEPTH_TEST);
                this.state.gl.DEPTH_TEST = true;
            }
        }

        let enable_depth_mask = this.state.gl.depthMask;
        switch (shader.spatial.depth_draw_mode) {
            case DEPTH_DRAW_ALPHA_PREPASS:
            case DEPTH_DRAW_OPAQUE: {
                enable_depth_mask = !p_alpha_pass && !shader.spatial.uses_depth_texture;
            } break;
            case DEPTH_DRAW_ALWAYS: {
                enable_depth_mask = true;
            } break;
            case DEPTH_DRAW_NEVER: {
                enable_depth_mask = false;
            } break;
        }
        if (this.state.gl.depthMask !== enable_depth_mask) {
            gl.depthMask(enable_depth_mask);
            this.state.gl.depthMask = enable_depth_mask;
        }

        this.set_uniform_n2("skeleton_texture_size", p_skeleton_tex_size, 0, true, true);

        // bind material specific textures
        let i = 0;
        for (let name in p_material.textures) {
            let tex = get_material_texture(p_material, name, this.storage.resources.white_tex.get_rid());

            if (tex.redraw_if_visible) {
                VisualServer.get_singleton().redraw_request();
            }

            if (tex.render_target) {
                tex.render_target.used_in_frame = true;
            }

            this.bind_texture(i, tex.gl_tex);
            this.set_uniform_n(name, i, true, true);
            if (i === 0) {
                this.state.current_main_tex = tex.gl_tex;
            }

            i += 1;
        }

        // bind material specific parameters
        for (let name in p_material.params) {
            this.set_uniform_v(name, p_material.params[name]);
        }

        return shader_rebind;
    }

    /**
     * @param {Element_t} p_element
     */
    _render_geometry(p_element: Element_t) {
        const gl = this.gl;

        switch (p_element.instance.base_type) {
            case INSTANCE_TYPE_MESH: {
                let s: Surface_t = p_element.geometry as Surface_t;

                if (s.index_array_len > 0) {
                    gl.drawElements(s.primitive, s.index_array_len, gl.UNSIGNED_SHORT, 0);
                } else {
                    gl.drawArrays(s.primitive, 0, s.array_len);
                }
            } break;
            case INSTANCE_TYPE_MULTIMESH: {
            } break;
            case INSTANCE_TYPE_IMMEDIATE: {
            } break;
        }
    }

    /**
     * @param {Environment_t} p_env
     * @param {CameraMatrix} p_cam_projection
     */
    _post_process(p_env: Environment_t, p_cam_projection: CameraMatrix) {
        const gl = this.gl;

        gl.depthMask(false);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.depthFunc(gl.LEQUAL);
        gl.colorMask(true, true, true, true);

        let use_post_process = p_env && !this.storage.frame.current_rt.flags.TRANSPARENT;
        use_post_process = use_post_process && this.storage.frame.current_rt.width >= 4 && this.storage.frame.current_rt.height >= 4;

        if (p_env) {
            use_post_process = use_post_process && !!(p_env.adjustments_enabled[0] || p_env.dof_blur_near_enabled[0] || p_env.dof_blur_far_enabled[0]);
        }
        use_post_process = use_post_process || this.storage.frame.current_rt.use_fxaa;

        // always copy final result to offscreen_effects[0]
        if (use_post_process) {
            this._copy_texture_to_buffer(this.storage.frame.current_rt.gl_color, this.storage.frame.current_rt.offscreen_effects[0].gl_fbo);
        } else {
            return;
        }

        // 1. DOF blur
        // 2. Glow
        // 3. Adjustment

        if (p_env.dof_blur_far_enabled[0]) {
            let vp_w = this.storage.frame.current_rt.width;
            let vp_h = this.storage.frame.current_rt.height;

            this.effect_blur_shader.set_conditional("USE_ORTHOGONAL_PROJECTION", p_cam_projection.is_orthogonal());
            this.effect_blur_shader.set_conditional("DOF_FAR_BLUR", true);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_LOW", p_env.dof_blur_far_quality[0] === 0);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_MEDIUM", p_env.dof_blur_far_quality[1] === 1);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_HIGH", p_env.dof_blur_far_quality[2] === 2);

            this.effect_blur_shader.bind();

            let radius = 0;
            switch (p_env.dof_blur_far_quality[0]) {
                case 0: {
                    radius = (p_env.dof_blur_far_amount[0] * p_env.dof_blur_far_amount[0]) / 4;
                } break;
                case 1: {
                    radius = (p_env.dof_blur_far_amount[0] * p_env.dof_blur_far_amount[0]) / 10;
                } break;
                case 2: {
                    radius = (p_env.dof_blur_far_amount[0] * p_env.dof_blur_far_amount[0]) / 20;
                } break;
            }

            this.effect_blur_shader.set_uniform_float("dof_begin", p_env.dof_blur_far_distance[0]);
            this.effect_blur_shader.set_uniform_float("dof_end", p_env.dof_blur_far_distance[0] + p_env.dof_blur_far_transition[0]);
            this.effect_blur_shader.set_uniform_float("dof_radius", radius);
            this.effect_blur_shader.set_uniform_vec2("pixel_size", 1 / vp_w, 1 / vp_h);
            this.effect_blur_shader.set_uniform_float("camera_z_near", p_cam_projection.get_z_near());
            this.effect_blur_shader.set_uniform_float("camera_z_far", p_cam_projection.get_z_far());

            // horizontal
            this.effect_blur_shader.set_uniform_vec2("dof_dir", 1, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.offscreen_effects[0].gl_color);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.gl_depth);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.offscreen_effects[1].gl_fbo);
            this.storage._copy_screen();

            // vertical
            this.effect_blur_shader.set_uniform_vec2("dof_dir", 0, 1);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.offscreen_effects[1].gl_color);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.gl_depth);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.offscreen_effects[0].gl_fbo);
            this.storage._copy_screen();

            this.effect_blur_shader.set_conditional("DOF_FAR_BLUR", false);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_LOW", false);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_MEDIUM", false);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_HIGH", false);
            this.effect_blur_shader.set_conditional("USE_ORTHOGONAL_PROJECTION", false);
        }

        if (p_env.dof_blur_near_enabled[0]) {
            let vp_w = this.storage.frame.current_rt.width;
            let vp_h = this.storage.frame.current_rt.height;

            this.effect_blur_shader.set_conditional("USE_ORTHOGONAL_PROJECTION", p_cam_projection.is_orthogonal());
            this.effect_blur_shader.set_conditional("DOF_NEAR_BLUR", true);
            this.effect_blur_shader.set_conditional("DOF_NEAR_FIRST_TAP", true);

            this.effect_blur_shader.set_conditional("DOF_QUALITY_LOW", p_env.dof_blur_near_quality[0] === 0);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_MEDIUM", p_env.dof_blur_near_quality[1] === 1);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_HIGH", p_env.dof_blur_near_quality[2] === 2);

            this.effect_blur_shader.bind();

            let radius = 0;
            switch (p_env.dof_blur_near_quality[0]) {
                case 0: {
                    radius = (p_env.dof_blur_near_amount[0] * p_env.dof_blur_near_amount[0]) / 4;
                } break;
                case 1: {
                    radius = (p_env.dof_blur_near_amount[0] * p_env.dof_blur_near_amount[0]) / 10;
                } break;
                case 2: {
                    radius = (p_env.dof_blur_near_amount[0] * p_env.dof_blur_near_amount[0]) / 20;
                } break;
            }

            this.effect_blur_shader.set_uniform_float("dof_begin", p_env.dof_blur_near_distance[0]);
            this.effect_blur_shader.set_uniform_float("dof_end", p_env.dof_blur_near_distance[0] - p_env.dof_blur_near_transition[0]);
            this.effect_blur_shader.set_uniform_vec2("dof_dir", 1, 0);
            this.effect_blur_shader.set_uniform_float("dof_radius", radius);
            this.effect_blur_shader.set_uniform_vec2("pixel_size", 1 / vp_w, 1 / vp_h);
            this.effect_blur_shader.set_uniform_float("camera_z_near", p_cam_projection.get_z_near());
            this.effect_blur_shader.set_uniform_float("camera_z_far", p_cam_projection.get_z_far());

            // horizontal

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.offscreen_effects[0].gl_color);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.gl_depth);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.offscreen_effects[1].gl_fbo);
            this.storage._copy_screen();

            // vertical
            this.effect_blur_shader.set_conditional("DOF_NEAR_FIRST_TAP", false);
            this.effect_blur_shader.bind();

            this.effect_blur_shader.set_uniform_float("dof_begin", p_env.dof_blur_near_distance[0]);
            this.effect_blur_shader.set_uniform_float("dof_end", p_env.dof_blur_near_distance[0] - p_env.dof_blur_near_transition[0]);
            this.effect_blur_shader.set_uniform_vec2("dof_dir", 0, 1);
            this.effect_blur_shader.set_uniform_float("dof_radius", radius);
            this.effect_blur_shader.set_uniform_vec2("pixel_size", 1 / vp_w, 1 / vp_h);
            this.effect_blur_shader.set_uniform_float("camera_z_near", p_cam_projection.get_z_near());
            this.effect_blur_shader.set_uniform_float("camera_z_far", p_cam_projection.get_z_far());

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.offscreen_effects[1].gl_color);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.gl_depth);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.offscreen_effects[0].gl_fbo);
            this.storage._copy_screen();

            this.effect_blur_shader.set_conditional("DOF_NEAR_BLUR", false);
            this.effect_blur_shader.set_conditional("DOF_NEAR_FIRST_TAP", false);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_LOW", false);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_MEDIUM", false);
            this.effect_blur_shader.set_conditional("DOF_QUALITY_HIGH", false);
            this.effect_blur_shader.set_conditional("USE_ORTHOGONAL_PROJECTION", false);

            this.storage.frame.current_rt.used_dof_blur_near = true;
        }

        // now draw final result back to current render target

        // this.storage.bind_copy_shader();

        this.storage.shaders.tonemap.set_conditional("USE_FXAA", this.storage.frame.current_rt.use_fxaa);
        this.storage.shaders.tonemap.bind();

        if (this.storage.frame.current_rt.use_fxaa) {
            this.storage.shaders.tonemap.set_uniform_vec2("pixel_size", 1 / this.storage.frame.current_rt.width, 1 / this.storage.frame.current_rt.height);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.offscreen_effects[0].gl_color);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.gl_fbo);

        // this.storage._copy_screen();
        this.storage.bind_quad_array(0, 4);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    set_uniform_n(name: string, value: number, force_changed: boolean = false, force_change_lock: boolean = false) {
        let state = this.state.uniform_states[name];
        if (!state) {
            state = this.state.uniform_states[name] = {
                changed: true,
                force_locked: false,
                value: [value],
            };
            return;
        }

        if (force_change_lock) {
            state.value[0] = value;
            state.force_locked = true;
        } else if (!state.force_locked) {
            if (Math.abs(state.value[0] - value) > UNIFORM_EPSILON) {
                state.value[0] = value;
                state.changed = true;
            }
        }

        if (force_changed) {
            state.changed = true;
        }
    }
    set_uniform_n2(name: string, v0: number, v1: number, force_changed: boolean = false, force_change_lock: boolean = false) {
        let state = this.state.uniform_states[name];
        if (!state) {
            state = this.state.uniform_states[name] = {
                changed: true,
                force_locked: false,
                value: [v0, v1],
            };
            return;
        }

        if (force_change_lock) {
            state.value[0] = v0;
            state.value[1] = v1;
            state.force_locked = true;
        } else if (!state.force_locked) {
            if (Math.abs(state.value[0] - v0) > UNIFORM_EPSILON) {
                state.value[0] = v0;
                state.changed = true;
            }
            if (Math.abs(state.value[1] - v1) > UNIFORM_EPSILON) {
                state.value[1] = v1;
                state.changed = true;
            }
        }

        if (force_changed) {
            state.changed = true;
        }
    }
    set_uniform_n3(name: string, v0: number, v1: number, v2: number, force_changed: boolean = false, force_change_lock: boolean = false) {
        let state = this.state.uniform_states[name];
        if (!state) {
            state = this.state.uniform_states[name] = {
                changed: true,
                force_locked: false,
                value: [v0, v1, v2],
            };
            return;
        }

        if (force_change_lock) {
            state.value[0] = v0;
            state.value[1] = v1;
            state.value[2] = v2;
            state.force_locked = true;
        } else if (!state.force_locked) {
            if (Math.abs(state.value[0] - v0) > UNIFORM_EPSILON) {
                state.value[0] = v0;
                state.changed = true;
            }
            if (Math.abs(state.value[1] - v1) > UNIFORM_EPSILON) {
                state.value[1] = v1;
                state.changed = true;
            }
            if (Math.abs(state.value[2] - v2) > UNIFORM_EPSILON) {
                state.value[2] = v2;
                state.changed = true;
            }
        }

        if (force_changed) {
            state.changed = true;
        }
    }
    set_uniform_n4(name: string, v0: number, v1: number, v2: number, v3: number, force_changed: boolean = false, force_change_lock: boolean = false) {
        let state = this.state.uniform_states[name];
        if (!state) {
            state = this.state.uniform_states[name] = {
                changed: true,
                force_locked: false,
                value: [v0, v1, v2, v3],
            };
            return;
        }

        if (force_change_lock) {
            state.value[0] = v0;
            state.value[1] = v1;
            state.value[2] = v2;
            state.value[3] = v3;
            state.force_locked = true;
        } else if (!state.force_locked) {
            if (Math.abs(state.value[0] - v0) > UNIFORM_EPSILON) {
                state.value[0] = v0;
                state.changed = true;
            }
            if (Math.abs(state.value[1] - v1) > UNIFORM_EPSILON) {
                state.value[1] = v1;
                state.changed = true;
            }
            if (Math.abs(state.value[2] - v2) > UNIFORM_EPSILON) {
                state.value[2] = v2;
                state.changed = true;
            }
            if (Math.abs(state.value[3] - v3) > UNIFORM_EPSILON) {
                state.value[3] = v3;
                state.changed = true;
            }
        }

        if (force_changed) {
            state.changed = true;
        }
    }
    set_uniform_v(name: string, value: number[], force_changed: boolean = false, force_change_lock: boolean = false) {
        let state = this.state.uniform_states[name];
        if (!state) {
            state = this.state.uniform_states[name] = {
                changed: true,
                force_locked: false,
                value: value.slice(),
            };
            return;
        }

        if (force_change_lock) {
            for (let i = 0; i < value.length; i++) {
                state.value[i] = value[i];
            }
            state.force_locked = true;
        } else if (!state.force_locked) {
            for (let i = 0; i < value.length; i++) {
                if (Math.abs(state.value[i] - value[i]) > UNIFORM_EPSILON) {
                    state.value[i] = value[i];
                    state.changed = true;
                }
            }
        }

        if (force_changed) {
            state.changed = true;
        }
    }
    get_uniform_v(name: string) {
        let state = this.state.uniform_states[name];
        return state ? state.value : null;
    }

    bind_texture(slot: number, texture: WebGLTexture) {
        const gl = this.gl;

        let state = this.state.texture_states[slot];
        if (!state) {
            state = this.state.texture_states[slot] = {
                slot,
                texture,
            };
            return;
        }

        if (state.texture !== texture) {
            state.texture = texture;

            gl.activeTexture(gl.TEXTURE0 + slot);
            gl.bindTexture(gl.TEXTURE_2D, texture);
        }
    }
}

type UniformState = { changed: boolean, value: number[], force_locked: boolean };
type TextureState = { slot: number, texture: WebGLTexture };

/**
 * @param {{ [name: string]: UniformState }} table
 */
function mark_uniforms_outdated(table: { [name: string]: UniformState; }) {
    for (let name in table) {
        table[name].changed = true;
        table[name].force_locked = false;
    }
}

/**
 * @param {{ [slot: number]: TextureState }} table
 */
function mark_textures_outdated(table: { [slot: number]: TextureState; }) {
    for (let slot in table) {
        table[slot].texture = null;
    }
}

/**
 * @param {Material_t} material
 * @param {string} name
 * @param {Texture_t} fallback
 */
function get_material_texture(material: Material_t, name: string, fallback: Texture_t) {
    return material.textures[name]
        ||
        (material.origin && material.origin.textures[name])
        ||
        fallback;
}

function add_to_condition(conditions: number[], name: keyof typeof SHADER_DEF): number[] {
    let value = SHADER_DEF[name];

    // already enabled
    if (conditions.indexOf(value) >= 0) {
        return conditions;
    }

    if (conditions.length === 0) {
        conditions.push(value);
    } else {
        if (value < conditions[0]) {
            conditions.unshift(value);
        } else {
            for (let i = 0; i < conditions.length; i++) {
                if (value > conditions[i]) {
                    conditions.splice(i + 1, 0, value);
                    break;
                }
            }
        }
    }

    return conditions;
}

function remove_from_condition(conditions: number[], name: keyof typeof SHADER_DEF): number[] {
    let value = SHADER_DEF[name];

    let idx = conditions.indexOf(value);
    if (idx >= 0) remove_item(conditions, idx);

    return conditions;
}

function is_condition_equal(c_A: number[], c_B: number[]): boolean {
    if (c_A.length !== c_B.length) return false;
    for (let i = 0; i < c_A.length; i++) {
        if (c_A[i] !== c_B[i]) return false;
    }
    return true;
}

function create_shader_config_key(config: MaterialInstanceConfig) {
    let key = `${config.features.sort().join(".")}.${config.diffuse}.${config.specular}`;
    for (let prop in config.spatial) {
        key += `.${prop}=${config.spatial[<keyof typeof config.spatial>prop] ? 1 : 0}`;
    }
    return key;
}

const _i_render_scene_Vector3_1 = new Vector3;
const _i_render_scene_Color_1 = new Color;
const _i_render_scene_Transform_1 = new Transform;

const _i_render_shadow_CameraMatrix_1 = new CameraMatrix;
const _i_render_shadow_Transform_1 = new Transform;

const _i_render_render_list_CameraMatrix_1 = new CameraMatrix;
const _i_render_render_list_Transform_1 = new Transform;

const _i_draw_sky_CameraMatrix_1 = new CameraMatrix;
const _i_draw_sky_Transform_1 = new Transform;
const _i_draw_sky_Vector3_1 = new Vector3;

const _i_setup_light_Vector3_1 = new Vector3;
const _i_setup_light_Vector3_2 = new Vector3;
const _i_setup_light_Vector3_3 = new Vector3;
const _i_setup_light_Vector3_4 = new Vector3;
const _i_setup_light_Vector3_5 = new Vector3;
const _i_setup_light_CameraMatrix_1 = new CameraMatrix;
const _i_setup_light_CameraMatrix_2 = new CameraMatrix;
const _i_setup_light_CameraMatrix_3 = new CameraMatrix;
const _i_setup_light_CameraMatrix_4 = new CameraMatrix;
const _i_setup_light_CameraMatrix_5 = new CameraMatrix;
const _i_setup_light_CameraMatrix_6 = new CameraMatrix;
const _i_setup_light_CameraMatrix_7 = new CameraMatrix;
const _i_setup_light_Transform_1 = new Transform;
const _i_setup_light_Transform_2 = new Transform;
const _i_setup_light_Transform_3 = new Transform;
const _i_setup_light_Rect2 = new Rect2;
