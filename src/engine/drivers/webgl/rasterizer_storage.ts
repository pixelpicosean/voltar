import { SelfList, List } from "engine/core/self_list";
import { next_power_of_2, deg2rad, clamp } from "engine/core/math/math_funcs";
import { Vector2 } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3";
import { AABB } from "engine/core/math/aabb";
import { Transform } from "engine/core/math/transform";
import { Color, ColorLike } from "engine/core/color";
import { OS } from "engine/core/os/os";

import {
    TEXTURE_TYPE_2D,
    USAGE_IMMUTABLE,
    FILTER_NEAREST,
    WRAP_REPEAT,
    WRAP_CLAMP_TO_EDGE,
    MULTIMESH_TRANSFORM_2D,
    MULTIMESH_COLOR_NONE,
    MULTIMESH_CUSTOM_DATA_NONE,
    MULTIMESH_COLOR_8BIT,
    MULTIMESH_COLOR_FLOAT,
    MULTIMESH_CUSTOM_DATA_8BIT,
    MULTIMESH_CUSTOM_DATA_FLOAT,
    INSTANCE_TYPE_NONE,
    INSTANCE_TYPE_MESH,
    INSTANCE_TYPE_LIGHT,
    LIGHT_SPOT,
    LIGHT_OMNI,
    LIGHT_DIRECTIONAL,
    LIGHT_PARAM_RANGE,
    LIGHT_PARAM_SPOT_ANGLE,
    TEXTURE_TYPE_CUBEMAP,
    LIGHT_PARAM_SHADOW_MAX_DISTANCE,
    LIGHT_PARAM_SHADOW_SPLIT_1_OFFSET,
    LIGHT_PARAM_SHADOW_SPLIT_2_OFFSET,
    LIGHT_PARAM_SHADOW_SPLIT_3_OFFSET,
    LIGHT_PARAM_SHADOW_NORMAL_BIAS,
    LIGHT_PARAM_SHADOW_BIAS,
    LIGHT_OMNI_SHADOW_DETAIL_VERTICAL,
    LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_STABLE,
    LIGHT_OMNI_SHADOW_DUAL_PARABOLOID,
    INSTANCE_TYPE_LIGHTMAP_CAPTURE,
} from "engine/servers/visual_server";
import {
    Instance_t,
} from "engine/servers/visual/visual_server_scene";
import { VSG } from "engine/servers/visual/visual_server_globals";

import { ARRAY_COLOR, ARRAY_MAX, ARRAY_NORMAL } from "engine/scene/const";
import {
    PIXEL_FORMAT_L8,
    PIXEL_FORMAT_LA8,
    PIXEL_FORMAT_RGB8,
    PIXEL_FORMAT_RGBA8,
    PIXEL_FORMAT_RGBA4,
    PIXEL_FORMAT_RGBA5551,
    ImageTexture,
    PIXEL_FORMAT_R8,
    PIXEL_FORMAT_DXT1,
    PIXEL_FORMAT_DXT3,
    PIXEL_FORMAT_DXT5,
    PIXEL_FORMAT_PVRTC2,
    PIXEL_FORMAT_PVRTC2A,
    PIXEL_FORMAT_PVRTC4,
    PIXEL_FORMAT_PVRTC4A,
    PIXEL_FORMAT_ETC,
} from "engine/scene/resources/texture";
// import { CubemapFilterShader } from "./shaders/cubemap_filter";
import { CopyShader } from "./shaders/copy";
import { TonemapShader } from "./shaders/tonemap";

type CubemapFilterShader = import("./shaders/cubemap_filter").CubemapFilterShader;

const SMALL_VEC2 = new Vector2(0.00001, 0.00001);
const SMALL_VEC3 = new Vector3(0.00001, 0.00001, 0.00001);

const _cube_side_enum = [
    WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
    WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
    WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
    WebGLRenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
];

function get_gl_texture_type(format: number) {
    switch (format) {
        case PIXEL_FORMAT_RGBA8:
            return WebGLRenderingContext.UNSIGNED_BYTE;
        default: return 0;
    }
}

/**
 * @param {number} format
 */
function get_gl_pixel_format(format: number) {
    switch (format) {
        case PIXEL_FORMAT_L8: return WebGLRenderingContext.LUMINANCE;
        case PIXEL_FORMAT_LA8: return WebGLRenderingContext.LUMINANCE_ALPHA;
        case PIXEL_FORMAT_RGB8: return WebGLRenderingContext.RGB;
        case PIXEL_FORMAT_RGBA8: return WebGLRenderingContext.RGBA;
        case PIXEL_FORMAT_RGBA4: return WebGLRenderingContext.RGBA4;
        case PIXEL_FORMAT_RGBA5551: return WebGLRenderingContext.RGB5_A1;
        default: return 0;
    }
}

/**
 * @param {number} format
 */
function get_gl_internal_format(format: number) {
    switch (format) {
        case PIXEL_FORMAT_L8:
        case PIXEL_FORMAT_LA8:
            return WebGLRenderingContext.LUMINANCE;
        case PIXEL_FORMAT_RGBA8:
            return WebGLRenderingContext.RGBA;
    }
    return 0;
}

let tex_uid = 0;
export class Texture_t {
    uid = tex_uid++;
    name = '';

    proxy: Texture_t = null;

    type = TEXTURE_TYPE_2D;
    render_target: RenderTarget_t = null;
    images: (HTMLImageElement | HTMLCanvasElement)[] = [];
    width = 0;
    height = 0;
    depth = 0;
    alloc_width = 0;
    alloc_height = 0;
    usage = USAGE_IMMUTABLE;
    format = PIXEL_FORMAT_L8;
    min_filter = FILTER_NEAREST;
    mag_filter = FILTER_NEAREST;
    wrap_u = WRAP_REPEAT;
    wrap_v = WRAP_REPEAT;
    has_mipmap = false;

    target = 0;
    gl_format_cache = 0;
    gl_internal_format_cache = 0;
    gl_type_cache = 0;

    compressed = false;

    srgb = false;

    mipmaps = 0;

    resize_to_po2 = false;

    active = false;

    redraw_if_visible = false;

    gl_depth_render_buffer: WebGLRenderbuffer = null;
    gl_tex: WebGLTexture = null;

    path = "";
    flags = {
        FILTER: false,
        REPEAT: false,
        MIPMAPS: false,
    };

    self() {
        if (this.proxy) return this.proxy;
        return this;
    }
}

let inst_uid = 0;
export class Instantiable_t {
    get i_type() { return INSTANCE_TYPE_NONE }

    uid = inst_uid++;

    instance_list: List<Instance_t> = new List;

    /**
     * @param {boolean} p_aabb
     * @param {boolean} p_materials
     */
    instance_change_notify(p_aabb: boolean, p_materials: boolean) {
        let instances = this.instance_list.first();
        while (instances) {
            instances.self().base_changed(p_aabb, p_materials);
            instances = instances.next();
        }
    }

    instance_remove_deps() {
        let instances = this.instance_list.first();
        while (instances) {
            instances.self().base_removed();
            instances = instances.next();
        }
    }
}

export const GEOMETRY_INVALID = 0;
export const GEOMETRY_SURFACE = 1;
export const GEOMETRY_IMMEDIATE = 2;
export const GEOMETRY_MULTISURFACE = 3;

export class Geometry_t extends Instantiable_t {
    get i_type() { return INSTANCE_TYPE_MESH }

    type = GEOMETRY_INVALID;

    material: Material_t = null;

    last_pass = 0;
    index = 0;
}

export class Light_t extends Instantiable_t {
    get i_type() { return INSTANCE_TYPE_LIGHT }

    type = LIGHT_DIRECTIONAL;

    param = [
        1.0, // energy
        1.0, // indirect energy
        0.5, // specular
        1.0, // range
        45,  // spot angle
    ];

    color = new Color(1, 1, 1, 1);
    shadow_color = new Color(0, 0, 0, 1);

    projector: Texture_t = null;

    shadow = false;
    negative = false;
    reverse_cull = false;

    cull_mask = 0xFFFFFFFF;

    directional_blend_splits = false;
    directional_shadow_mode = 0;
    directional_range_mode = LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_STABLE;

    omni_shadow_mode = LIGHT_OMNI_SHADOW_DUAL_PARABOLOID;
    omni_shadow_detail = LIGHT_OMNI_SHADOW_DETAIL_VERTICAL;

    version = 0;
}

export class LightmapCapture_t extends Instantiable_t {
    get i_type() { return INSTANCE_TYPE_LIGHTMAP_CAPTURE }

    bounds = new AABB;

    energy = 1.0;
}

class Effect_t {
    width = 0;
    height = 0;

    gl_color: WebGLTexture = null;
    gl_depth: WebGLTexture = null;

    gl_fbo: WebGLFramebuffer = null;
}

class RenderTargetFlags {
    VFLIP = false;
    TRANSPARENT = false;
    NO_3D_EFFECTS = false;
    NO_3D = false;
    NO_SAMPLING = false;
    KEEP_3D_LINEAR = false;
    DIRECT_TO_SCREEN = false;
}

export class RenderTarget_t {
    name = '';

    x = 0;
    y = 0;
    width = 0;
    height = 0;

    flags = new RenderTargetFlags;

    used_in_frame = false;

    use_fxaa = false;

    used_dof_blur_near = false;
    offscreen_effects_allocated = false;

    offscreen_effects = [new Effect_t, new Effect_t];

    texture: Texture_t = null;

    copy_screen_effect = new Effect_t;

    gl_fbo: WebGLFramebuffer = null;
    gl_color: WebGLTexture = null;
    gl_depth: WebGLTexture = null;
}

export const BLEND_MODE_MIX = 0;
export const BLEND_MODE_ADD = 1;
export const BLEND_MODE_SUB = 2;
export const BLEND_MODE_MUL = 3;

export const DEPTH_DRAW_OPAQUE = 0;
export const DEPTH_DRAW_ALWAYS = 1;
export const DEPTH_DRAW_NEVER = 2;
export const DEPTH_DRAW_ALPHA_PREPASS = 3;

export const CULL_MODE_FRONT = 0;
export const CULL_MODE_BACK = 1;
export const CULL_MODE_DISABLED = 2;

/** @type {{ [id: number]: { [key: string]: Shader_t }}} */
let shader_with_defines: { [id: number]: { [key: string]: Shader_t; }; } = {};
let shader_uid = 0;
export class Shader_t {
    id = shader_uid++;

    name = '';

    last_pass = 0;
    index = 0;

    gl_prog: WebGLProgram = null;

    uniforms: { [s: string]: { type: UniformTypes; gl_loc: WebGLUniformLocation; }; } = Object.create(null);

    canvas_item = {
        blend_mode: BLEND_MODE_MIX,

        uses_screen_texture: false,
        uses_time: false,
    };

    spatial = {
        blend_mode: BLEND_MODE_MIX,
        depth_draw_mode: DEPTH_DRAW_OPAQUE,
        cull_mode: CULL_MODE_FRONT,

        uses_alpha: false,
        uses_alpha_scissor: false,
        unshaded: false,
        no_depth_test: false,
        uses_screen_texture: false,
        uses_depth_texture: false,
        uses_time: false,
        uses_tangent: false,
        uses_world_coordinates: false,
    };

    data = {
        vs: '',
        fs: '',
        attrs: [] as { name: string, loc: number }[],
        uniforms: [] as { name: string, type: UniformTypes }[],
    };
}

let mat_clone_record: { [name: string]: number; } = {};
let mat_uid = 0;
export class Material_t {
    id = mat_uid++;
    name = '';

    batchable = false;

    render_priority = 0;

    list: SelfList<Material_t> = new SelfList(this);
    dirty_list: SelfList<Material_t> = new SelfList(this);

    can_cast_shadow_cache = false;
    is_animated_cache = false;

    next_pass: Material_t = null;

    index = 0;
    last_pass = 0;

    shader: Shader_t = null;

    flags: { [s: string]: boolean } = Object.create(null);
    params: { [s: string]: number[] } = Object.create(null);
    textures: { [s: string]: Texture_t } = Object.create(null);

    origin: Material_t = null;

    fork() {
        let m = new Material_t;

        m.origin = this;

        if (!mat_clone_record[this.name]) {
            mat_clone_record[this.name] = 1;
        } else {
            mat_clone_record[this.name] += 1;
        }
        m.name = `${this.name}_${mat_clone_record[this.name]}`;

        m.batchable = this.batchable;
        m.render_priority = this.render_priority;

        m.next_pass = this.next_pass;

        m.can_cast_shadow_cache = this.can_cast_shadow_cache;
        m.is_animated_cache = this.is_animated_cache;

        m.shader = this.shader;

        for (let k in this.flags) {
            m.flags[k] = this.flags[k];
        }
        for (let k in this.params) {
            m.params[k] = this.params[k].slice();
        }
        for (let k in this.textures) {
            m.textures[k] = this.textures[k];
        }

        return m;
    }
}

export interface VertAttrib {
    enabled: boolean;
    index: number;
    type: number;
    size: number;
    normalized: boolean;
    stride: number;
    offset: number;
}

export interface VertAttribDef {
    index: number;
    type: number;
    size: number;
    normalized?: boolean;
    stride: number;
    offset: number;
}

export class Surface_t extends Geometry_t {
    attribs: VertAttrib[] = [];

    mesh: Mesh_t = null;

    vertex_id: WebGLBuffer = null;
    index_id: WebGLBuffer = null;
    vao_id: WebGLVertexArrayObject = null;

    aabb = new AABB;

    array_len = 0;
    index_array_len = 0;

    array_byte_size = 0;
    index_array_byte_size = 0;

    primitive = WebGLRenderingContext.TRIANGLES;

    active = false;

    data: ArrayBuffer | Float32Array = null;
    index_data: ArrayBuffer | Uint16Array = null;
}

export class Mesh_t extends Instantiable_t {
    get i_type() { return INSTANCE_TYPE_MESH }

    active = false;

    multimeshes: List<MultiMesh_t> = new List;

    surfaces: Surface_t[] = [];

    // TODO: cache and update combined aabb

    update_multimeshes() { }
}

/** @type {{ [length: string]: Float32Array[] }} */
const Float32ArrayPool: { [length: string]: Float32Array[]; } = {}
/**
 * @param {number} size
 */
function new_float32array(size: number) {
    const length = next_power_of_2(size);
    let pool = Float32ArrayPool[length];
    if (!pool) {
        pool = Float32ArrayPool[length] = [];
    }
    let array = pool.pop();
    if (!array) {
        return new Float32Array(length);
    }
    return array;
}
/**
 * @param {Float32Array} array
 */
function free_float32array(array: Float32Array) {
    const length = array.length;
    let pool = Float32ArrayPool[length];
    if (!pool) {
        pool = Float32ArrayPool[length] = [];
    }
    pool.push(array);
}

export class MultiMesh_t {
    mesh: Mesh_t = null;
    size = 0;

    transform_format = MULTIMESH_TRANSFORM_2D;
    color_format = MULTIMESH_COLOR_NONE;
    custom_data_format = MULTIMESH_CUSTOM_DATA_NONE;

    xform_floats = 0;
    color_floats = 0;
    custom_data_floats = 0;

    update_list: SelfList<MultiMesh_t> = new SelfList(this);
    mesh_list: SelfList<MultiMesh_t> = new SelfList(this);

    buffer: WebGLBuffer = null;

    data: Float32Array = null;

    aabb: AABB = null;

    dirty_aabb = true;
    dirty_data = true;

    visible_instances = 0;
}

export class Skeleton_t {
    size = 0;
    bone_data: Float32Array = null;
    gl_tex: WebGLTexture = null;

    update_list: SelfList<Skeleton_t> = new SelfList(this);
    instances: Set<Instance_t> = new Set;
}

export class Sky_t {
    panorama: Texture_t = null;
    radiance: WebGLTexture = null;
    radiance_size = 0;
}

interface BufferPack {
    size: number;
    gl_buf: WebGLBuffer;
}

export class RasterizerStorage {
    gl: WebGLRenderingContext = null;

    frame = {
        clear_request: true,
        clear_request_color: new Color(0, 0, 0, 1),
        current_rt: null as RenderTarget_t,
        time: [0, 0, 0, 0],
        count: 0,
        delta: 0,
    };

    multimesh_update_list: List<MultiMesh_t> = new List;

    _material_dirty_list: List<Material_t> = new List;

    shaders = {
        copy: null as CopyShader,
        tonemap: null as TonemapShader,
        cubemap_filter: null as CubemapFilterShader,
    };

    resources = {
        white_tex: null as ImageTexture,
        black_tex: null as ImageTexture,
        normal_tex: null as ImageTexture,
        aniso_tex: null as ImageTexture,

        mipmap_blur_fbo: null as WebGLFramebuffer,
        mipmap_blur_color: null as WebGLTexture,

        quadie: null as WebGLBuffer,

        skeleton_transform_buffer_size: 0,
        skeleton_transform_buffer: null as WebGLBuffer,
        skeleton_transform_cpu_buffer: new Float32Array(1024 * 8),

        radical_inverse_vdc_cache_tex: null as WebGLTexture,
    };

    buffers: { [n: number]: BufferPack[]; } = {};
    used_buffers: BufferPack[] = [];

    skeleton_update_list: List<Skeleton_t> = new List;
    onload_update_list: List<Function> = new List;

    canvas: import('./rasterizer_canvas').RasterizerCanvas = null;
    scene: import('./rasterizer_scene').RasterizerScene = null;

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl: WebGLRenderingContext) {
        this.gl = gl;

        // quad for copying stuff
        {
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1, 0, 0,
                -1, +1, 0, 1,
                +1, +1, 1, 1,
                +1, -1, 1, 0,
            ]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            this.resources.quadie = buf;
        }

        // default textures
        {
            const create_texture = (/** @type {Uint8Array} */texdata: Uint8Array, /** @type {string} */name: string) => {
                const tex = new ImageTexture;
                tex.create_from_data(texdata, 8, 8);
                tex.texture.name = name;
                return tex;
            }
            // - white
            const white_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i++) {
                white_texdata[i] = 255;
            }
            this.resources.white_tex = create_texture(white_texdata, '_white_');
            // - black
            const black_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                black_texdata[i + 0] = 0;
                black_texdata[i + 1] = 0;
                black_texdata[i + 2] = 0;
                black_texdata[i + 3] = 255;
            }
            this.resources.black_tex = create_texture(black_texdata, '_black_');
            // - normal
            const normal_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                normal_texdata[i + 0] = 128;
                normal_texdata[i + 1] = 128;
                normal_texdata[i + 2] = 255;
                normal_texdata[i + 3] = 255;
            }
            this.resources.normal_tex = create_texture(normal_texdata, '_normal_');
            // - aniso
            const aniso_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                aniso_texdata[i + 0] = 255;
                aniso_texdata[i + 1] = 128;
                aniso_texdata[i + 2] = 0;
                aniso_texdata[i + 3] = 255;
            }
            this.resources.aniso_tex = create_texture(aniso_texdata, '_aniso_');
        }

        // skeleton buffer
        {
            this.resources.skeleton_transform_buffer_size = 0;
            this.resources.skeleton_transform_buffer = gl.createBuffer();
        }

        {
            this.resources.radical_inverse_vdc_cache_tex = gl.createTexture();

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.resources.radical_inverse_vdc_cache_tex);

            let radical_inverse = new Uint8Array(512);

            for (let i = 0; i < 512; i++) {
                let bits = i;

                bits = (bits << 16) | (bits >> 16);
                bits = ((bits & 0x55555555) << 1) | ((bits & 0xAAAAAAAA) >> 1);
                bits = ((bits & 0x33333333) << 2) | ((bits & 0xCCCCCCCC) >> 2);
                bits = ((bits & 0x0F0F0F0F) << 4) | ((bits & 0xF0F0F0F0) >> 4);
                bits = ((bits & 0x00FF00FF) << 8) | ((bits & 0xFF00FF00) >> 8);

                let value = bits * 2.3283064365386963e-10;
                radical_inverse[i] = Math.floor(clamp(value * 255, 0, 255));
            }

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 512, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, radical_inverse);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        {
            this.resources.mipmap_blur_fbo = gl.createFramebuffer();
            this.resources.mipmap_blur_color = gl.createTexture();
        }

        this.shaders.copy = new CopyShader;
        this.shaders.tonemap = new TonemapShader;
        // this.shaders.cubemap_filter = new CubemapFilterShader;
    }

    /**
     * @param {any} rid
     */
    free_rid(rid: any) { return false }

    bind_copy_shader() {
        this.gl.useProgram(this.canvas.copy_shader.gl_prog);
    }

    bind_quad_array(vertex_idx = 0, uv_idx = 1) {
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.quadie);

        gl.vertexAttribPointer(vertex_idx, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(vertex_idx);
        gl.vertexAttribPointer(uv_idx, 2, gl.FLOAT, false, 16, 8);
        gl.enableVertexAttribArray(uv_idx);
    }

    _copy_screen() {
        this.bind_quad_array();
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
    }

    update_onload_update_list() {
        while (this.onload_update_list.first()) {
            let func = this.onload_update_list.first().self();
            func();
            this.onload_update_list.remove(this.onload_update_list.first());
        }
    }

    update_dirty_resources() {
        this.update_dirty_shaders();
        this.update_dirty_materials();
        this.update_dirty_skeletons();
        this.update_dirty_multimeshes();
        this.update_dirty_buffers();
    }
    update_dirty_shaders() { }
    update_dirty_materials() { }
    update_dirty_skeletons() {
        if (VSG.config.use_skeleton_software) return;

        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);

        while (this.skeleton_update_list.first()) {
            let skeleton = this.skeleton_update_list.first().self();

            if (skeleton.size) {
                gl.bindTexture(gl.TEXTURE_2D, skeleton.gl_tex);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, skeleton.size * 3, 1, gl.RGBA, gl.FLOAT, skeleton.bone_data);
            }

            for (let E of skeleton.instances) {
                E.base_changed(true, false);
            }

            this.skeleton_update_list.remove(this.skeleton_update_list.first());
        }
    }
    update_dirty_multimeshes() {
        const gl = this.gl;

        while (this.multimesh_update_list.first()) {
            const multimesh = this.multimesh_update_list.first().self();

            if (multimesh.size && multimesh.dirty_data) {
                if (!multimesh.buffer) {
                    multimesh.buffer = gl.createBuffer();
                }

                gl.bindBuffer(gl.ARRAY_BUFFER, multimesh.buffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, multimesh.data);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }
            multimesh.dirty_data = false;

            // TODO: update AABB of dirty multi-mesh
            multimesh.dirty_aabb = false;

            this.multimesh_update_list.remove(this.multimesh_update_list.first());
        }
    }
    update_dirty_buffers() {
        // recycle used buffers to
        for (const b of this.used_buffers) {
            this.buffers[b.size].push(b);
        }
        this.used_buffers.length = 0;
    }

    /* Texture API */

    texture_create() {
        let texture = new Texture_t;
        texture.gl_tex = this.gl.createTexture();
        texture.active = false;
        return texture;
    }
    texture_allocate(texture: Texture_t, p_width: number, p_height: number, p_depth: number, p_format: number, p_type: number, p_flags: import("engine/scene/resources/texture").ImageFlags = {}) {
        const gl = this.gl;

        texture.width = p_width;
        texture.height = p_height;
        texture.format = p_format;
        texture.type = p_type;

        switch (p_type) {
            case TEXTURE_TYPE_2D: {
                texture.target = gl.TEXTURE_2D;
                texture.images.length = 1;
            } break;
            case TEXTURE_TYPE_CUBEMAP: {
                texture.target = gl.TEXTURE_CUBE_MAP;
                texture.images.length = 6;
            } break;
            default: {
                console.error("Unknown texture type!");
                return;
            }
        }

        texture.alloc_width = texture.width;
        texture.alloc_height = texture.alloc_height;
        texture.resize_to_po2 = false;

        this._get_gl_image_and_format(texture);

        texture.mipmaps = 1;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(texture.target, texture.gl_tex);
        Object.assign(texture.flags, p_flags);

        texture.active = true;
    }

    /**
     * @param {Texture_t} texture
     */
    texture_free(texture: Texture_t) {
        const gl = this.gl;
        gl.deleteTexture(texture.gl_tex);
        texture.active = false;
    }

    /**
     * @param {Texture_t} p_texture
     */
    _get_gl_image_and_format(p_texture: Texture_t) {
        const gl = this.gl;
        const ext = OS.get_singleton().gl_ext;

        let texture = p_texture.self();

        switch (texture.format) {
            case PIXEL_FORMAT_L8: {
                texture.gl_internal_format_cache = gl.LUMINANCE;
                texture.gl_format_cache = gl.LUMINANCE;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_LA8: {
                texture.gl_internal_format_cache = gl.LUMINANCE_ALPHA;
                texture.gl_format_cache = gl.LUMINANCE_ALPHA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_R8: {
                texture.gl_internal_format_cache = gl.ALPHA;
                texture.gl_format_cache = gl.ALPHA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_RGB8: {
                texture.gl_internal_format_cache = gl.RGB;
                texture.gl_format_cache = gl.RGB;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_RGBA8: {
                texture.gl_internal_format_cache = gl.RGBA;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_RGBA4: {
                texture.gl_internal_format_cache = gl.RGBA;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_SHORT_4_4_4_4;
            } break;
            case PIXEL_FORMAT_DXT1: {
                if (!VSG.config.s3tc_supported) {
                    console.error("DXT1 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_S3TC_DXT1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_DXT3: {
                if (!VSG.config.s3tc_supported) {
                    console.error("DXT3 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_S3TC_DXT3;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_DXT5: {
                if (!VSG.config.s3tc_supported) {
                    console.error("DXT5 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_S3TC_DXT5;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_ETC: {
                if (!VSG.config.etc1_supported) {
                    console.error("ETC texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGB_ETC1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC2: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC2 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGB_PVRTC_2BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC2A: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC2A texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_PVRTC_2BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC4: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC4 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGB_PVRTC_4BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC4A: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC4A texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_PVRTC_4BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
        }
    }

    texture_set_image(rid: Texture_t, p_data: import("engine/scene/resources/texture").DOMImageData) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);

        if (rid.flags.FILTER) {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        if (rid.flags.REPEAT) {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.format), get_gl_pixel_format(rid.format), get_gl_texture_type(rid.format), p_data);

        if (rid.flags.MIPMAPS) {
            gl.generateMipmap(rid.target);
        }
    }
    /**
     * @param {Texture_t} rid
     * @param {import("engine/scene/resources/texture").RawImageData} p_data
     */
    texture_set_data(rid: Texture_t, p_data: import("engine/scene/resources/texture").RawImageData) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);

        if (rid.flags.FILTER) {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        if (rid.flags.REPEAT) {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        if (rid.compressed) {
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
            gl.compressedTexImage2D(gl.TEXTURE_2D, 0, rid.gl_internal_format_cache, rid.width, rid.height, 0, p_data);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.format), rid.width, rid.height, 0, get_gl_pixel_format(rid.format), get_gl_texture_type(rid.format), p_data);
        }

        if (rid.flags.MIPMAPS) {
            gl.generateMipmap(rid.target);
        }
    }

    /**
     * @param {Texture_t} rid
     * @param {Texture_t} p_proxy
     */
    texture_set_proxy(rid: Texture_t, p_proxy: Texture_t) {
        rid.proxy = null;

        if (p_proxy) {
            rid.proxy = p_proxy;
        }
    }

    /**
     * @param {Texture_t} rid
     * @param {import("engine/scene/resources/texture").ImageFlags} flags
     */
    texture_set_flags(rid: Texture_t, flags: import("engine/scene/resources/texture").ImageFlags) {
        const gl = this.gl;

        Object.assign(rid.flags, flags);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(rid.target, rid.gl_tex);

        if (rid.flags.REPEAT && rid.target !== gl.TEXTURE_CUBE_MAP) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        if (rid.flags.MIPMAPS) {
            if (rid.mipmaps === 1) {
                gl.generateMipmap(rid.target);
            }
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
            if (rid.flags.FILTER) {
                gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            } else {
                gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            }
        }

        if (rid.flags.FILTER) {
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }
    }

    /* RenderTarget API */

    render_target_create() {
        const rt = new RenderTarget_t;
        rt.texture = new Texture_t;
        rt.texture.render_target = rt;
        return rt;
    }
    /**
     * @param {RenderTarget_t} rt
     */
    render_target_free(rt: RenderTarget_t) {
        this._render_target_clear(rt);
        this.texture_free(rt.texture);
    }
    /**
     * @param {RenderTarget_t} rt
     * @param {number} p_width
     * @param {number} p_height
     */
    render_target_set_size(rt: RenderTarget_t, p_width: number, p_height: number) {
        if (rt.width === p_width && rt.height === p_height) {
            return;
        }

        this._render_target_clear(rt);

        rt.width = p_width;
        rt.height = p_height;

        this._render_target_allocate(rt);
    }

    /**
     * @param {RenderTarget_t} rt
     * @param {number} p_x
     * @param {number} p_y
     */
    render_target_set_position(rt: RenderTarget_t, p_x: number, p_y: number) {
        rt.x = p_x;
        rt.y = p_y;
    }

    /**
     * @param {RenderTarget_t} rt
     */
    render_target_was_used(rt: RenderTarget_t) {
        return rt.used_in_frame;
    }

    /**
     * @param {RenderTarget_t} rt
     */
    render_target_clear_used(rt: RenderTarget_t) {
        rt.used_in_frame = false;
    }

    render_target_set_flag(rt: RenderTarget_t, flag: keyof RenderTargetFlags, p_enable: boolean) {
        if (flag === "DIRECT_TO_SCREEN") {
            this._render_target_clear(rt);
            rt.flags[flag] = p_enable;
            this._render_target_allocate(rt);
        }

        rt.flags[flag] = p_enable;

        switch (flag) {
            case "TRANSPARENT":
            case "NO_3D":
            case "NO_SAMPLING":
            case "NO_3D_EFFECTS": {
                this._render_target_clear(rt);
                this._render_target_allocate(rt);
            } break;
        }
    }

    /**
     * @param {RenderTarget_t} rt
     */
    _render_target_clear(rt: RenderTarget_t) {
        if (rt.flags.DIRECT_TO_SCREEN) {
            return;
        }

        const gl = this.gl;

        if (rt.gl_fbo) {
            gl.deleteFramebuffer(rt.gl_fbo);
            gl.deleteTexture(rt.gl_color);
            rt.gl_fbo = null;
        }

        if (rt.gl_depth) {
            if (false) { // depth texture
            } else {
                gl.deleteRenderbuffer(rt.gl_depth);
            }
            rt.gl_depth = null;
        }

        let tex = rt.texture;
        tex.width = tex.height = 0;

        if (rt.copy_screen_effect.gl_color) {
            gl.deleteFramebuffer(rt.copy_screen_effect.gl_fbo);
            rt.copy_screen_effect.gl_fbo = null;

            gl.deleteTexture(rt.copy_screen_effect.gl_color);
            rt.copy_screen_effect.gl_color = null;
        }
    }

    /**
     * @param {RenderTarget_t} rt
     */
    _render_target_allocate(rt: RenderTarget_t) {
        if (rt.width <= 0 || rt.height <= 0) {
            return;
        }

        if (rt.flags.DIRECT_TO_SCREEN) {
            rt.gl_fbo = null;
            return;
        }

        const gl = this.gl;

        let color_internal_format = -1;
        let color_format = -1;
        let color_type = gl.UNSIGNED_BYTE;
        let image_format = -1;

        if (rt.flags.TRANSPARENT) {
            color_internal_format = gl.RGBA;
            color_format = gl.RGBA;
            image_format = PIXEL_FORMAT_RGBA8;
        } else {
            color_internal_format = gl.RGB;
            color_format = gl.RGB;
            image_format = PIXEL_FORMAT_RGB8;
        }

        rt.used_dof_blur_near = false;
        rt.offscreen_effects_allocated = false;

        {
            /* front FBO */

            let texture = rt.texture;

            // framebuffer
            rt.gl_fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, rt.gl_fbo);

            // color
            rt.gl_color = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, rt.gl_color);

            if (texture.flags.FILTER) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.texImage2D(gl.TEXTURE_2D, 0, color_internal_format, rt.width, rt.height, 0, color_format, color_type, null);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt.gl_color, 0);

            // depth
            if (VSG.config.support_depth_texture) {
                rt.gl_depth = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, rt.gl_depth);

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.texImage2D(gl.TEXTURE_2D, 0, VSG.config.depth_internalformat, rt.width, rt.height, 0, gl.DEPTH_COMPONENT, VSG.config.depth_type, null);

                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, rt.gl_depth, 0);
            } else {
                rt.gl_depth = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, rt.gl_depth);
                gl.renderbufferStorage(gl.RENDERBUFFER, VSG.config.depth_buffer_internalformat, rt.width, rt.height);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rt.gl_depth);
            }

            texture.format = image_format;
            texture.gl_tex = rt.gl_color;
            texture.width = rt.width;
            texture.height = rt.height;

            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                console.error("Framebuffer not complete");
            }
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (!rt.flags.NO_SAMPLING) {
            rt.copy_screen_effect.gl_color = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, rt.copy_screen_effect.gl_color);

            if (rt.flags.TRANSPARENT) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rt.width, rt.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, rt.width, rt.height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            rt.copy_screen_effect.gl_fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, rt.copy_screen_effect.gl_fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt.copy_screen_effect.gl_color, 0);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        // alloc textures for post process
        if (!rt.flags.NO_3D && rt.width >= 2 && rt.height >= 2) {
            for (let i = 0; i < rt.offscreen_effects.length; i++) {
                let effect = rt.offscreen_effects[i];

                effect.gl_color = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, effect.gl_color);
                gl.texImage2D(gl.TEXTURE_2D, 0, color_internal_format, rt.width, rt.height, 0, color_format, color_type, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                effect.gl_fbo = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, effect.gl_fbo);

                gl.bindTexture(gl.TEXTURE_2D, effect.gl_color);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, effect.gl_color, 0);

                gl.clearColor(1, 0, 1, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }

            rt.offscreen_effects_allocated = true;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* Material API */

    shader_create(vs: string, fs: string, attrs: AttribDesc[], uniforms: UniformDesc[]) {
        const gl = this.gl;

        const shd = new Shader_t;
        shd.data.vs = vs;
        shd.data.fs = fs;
        shd.data.attrs = attrs;
        shd.data.uniforms = uniforms;

        const gl_vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(gl_vs, vs);
        gl.compileShader(gl_vs);
        if (!gl.getShaderParameter(gl_vs, gl.COMPILE_STATUS)) {
            console.error(`Failed to compile vertex shader: ${gl.getShaderInfoLog(gl_vs)}`)
            return null;
        }

        const gl_fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(gl_fs, fs);
        gl.compileShader(gl_fs);
        if (!gl.getShaderParameter(gl_fs, gl.COMPILE_STATUS)) {
            console.error(`Failed to compile fragment shader: ${gl.getShaderInfoLog(gl_fs)}`)
            return null;
        }

        const gl_prog = gl.createProgram();
        gl.attachShader(gl_prog, gl_vs);
        gl.attachShader(gl_prog, gl_fs);

        for (let i = 0; i < attrs.length; i++) {
            gl.bindAttribLocation(gl_prog, attrs[i].loc, attrs[i].name);
        }

        gl.linkProgram(gl_prog);

        gl.deleteShader(gl_vs);
        gl.deleteShader(gl_fs);

        if (!gl.getProgramParameter(gl_prog, gl.LINK_STATUS)) {
            console.error(`Failed to link shader program: ${gl.getProgramInfoLog(gl_prog)}`);
            gl.deleteProgram(gl_prog);
            return null;
        }

        shd.gl_prog = gl_prog;

        for (let i = 0; i < uniforms.length; i++) {
            const u = uniforms[i]
            let gl_loc = gl.getUniformLocation(gl_prog, u.name);
            if (gl_loc) {
                shd.uniforms[u.name] = {
                    type: u.type,
                    gl_loc,
                };
            }
        }

        return shd;
    }

    shader_get_instance_with_defines(shader: Shader_t, conditions: number[], def_str: string) {
        let table = shader_with_defines[shader.id];
        if (!table) {
            shader_with_defines[shader.id] = table = {};
        }

        let id = conditions.join(",");

        let shd = table[id];
        if (!shd) {
            shd = this.shader_create(
                `${def_str}\n${shader.data.vs}`,
                `${def_str}\n${shader.data.fs}`,
                shader.data.attrs,
                shader.data.uniforms
            );
            shd.name = shader.name;
            table[id] = shd;
        }

        return shd;
    }

    material_create(shader: Shader_t, param: { [s: string]: number[]; } = {}, uses_screen_texture: boolean = false) {
        const mt = new Material_t;
        mt.shader = shader;
        mt.shader.canvas_item.uses_screen_texture = uses_screen_texture;

        for (const k in shader.uniforms) {
            const u = shader.uniforms[k];
            if (!u.gl_loc) continue;
            switch (u.type) {
                case '1f': mt.params[k] = param[k] || [0]; break;
                case '2f': mt.params[k] = param[k] || [0, 0]; break;
                case '3f': mt.params[k] = param[k] || [0, 0, 0]; break;
                case '4f': mt.params[k] = param[k] || [0, 0, 0, 0]; break;
                case 'mat3': mt.params[k] = param[k] || [1, 0, 0, 0, 1, 0, 0, 0, 1]; break;
                case 'mat4': mt.params[k] = param[k] || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; break;

                // texture
                case '1i': {
                    mt.textures[k] = null;
                } break;
            }
        }

        return mt;
    }

    material_set_param(mt: Material_t, param: { [s: string]: number[]; }) {
        for (let k in param) {
            for (let i = 0; i < mt.params[k].length; i++) {
                mt.params[k][i] = param[k][i];
            }
        }
    }

    material_casts_shadows(mt: Material_t): boolean {
        if (mt.dirty_list.in_list()) {
            this._update_material(mt);
        }

        let casts_shadows = mt.can_cast_shadow_cache;

        if (!casts_shadows && mt.next_pass) {
            casts_shadows = this.material_casts_shadows(mt.next_pass);
        }

        return casts_shadows;
    }

    _update_material(mt: Material_t) {
        if (mt.dirty_list.in_list()) {
            this._material_dirty_list.remove(mt.dirty_list);
        }

        // @Incomplete: update shader/material
    }

    /* Mesh API */

    mesh_create() {
        return new Mesh_t;
    }
    /**
     * @param {Mesh_t} mesh
     */
    mesh_free(mesh: Mesh_t) {
        this.mesh_clear(mesh);
    }
    /**
     * @param {Mesh_t} mesh
     * @param {number} surf_index
     */
    mesh_remove_surface(mesh: Mesh_t, surf_index: number) {
        const gl = this.gl;

        const surface = mesh.surfaces[surf_index];

        if (surface.material) {
            // TODO: this._material_remove_geometry(surface.material, surface);
        }

        gl.deleteBuffer(surface.vertex_id);
        if (surface.index_id) {
            gl.deleteBuffer(surface.index_id);
        }

        mesh.surfaces.splice(surf_index, 1);
    }
    /**
     * @param {Mesh_t} mesh
     */
    mesh_clear(mesh: Mesh_t) {
        while (mesh.surfaces.length > 0) {
            this.mesh_remove_surface(mesh, 0);
        }
    }
    mesh_add_surface_from_data(mesh: Mesh_t, primitive: number, attribs: VertAttribDef[], vertices: ArrayBuffer | Float32Array, indices: ArrayBuffer | Uint16Array, array_len: number, index_array_len: number, use_3d_vertices: boolean = false, p_aabb: AABB = null) {
        const gl = this.gl;

        const surface = new Surface_t;
        surface.active = true;
        surface.data = vertices;
        surface.array_len = array_len;
        surface.array_byte_size = vertices.byteLength;
        if (indices) {
            surface.index_data = indices;
            surface.index_array_len = index_array_len;
            surface.index_array_byte_size = indices.byteLength;
        }
        surface.primitive = primitive;
        surface.mesh = mesh;

        let stride = 0;
        for (let i = 0; i < ARRAY_MAX; i++) {
            /** @type {VertAttribDef} */
            let def: VertAttribDef = null;
            loop_attr: for (let j = 0; j < attribs.length; j++) {
                let a = attribs[j];
                if (a.index === i) {
                    def = a;
                    break loop_attr;
                }
            }

            if (!def) {
                surface.attribs[i] = {
                    enabled: false,
                    index: i,

                    type: 0,
                    size: 0,
                    normalized: false,
                    stride: 0,
                    offset: 0,
                }
            } else {
                /** @type {VertAttrib} */
                surface.attribs[i] = {
                    enabled: true,
                    index: i,

                    type: def.type,
                    size: def.size,
                    normalized: def.normalized || false,
                    stride: def.stride,
                    offset: def.offset,
                };

                if (stride === 0) stride = def.stride;
            }
        }

        // calculate AABB, cannot calculate from u8 array data
        if (!p_aabb && vertices instanceof Float32Array) {
            if (use_3d_vertices) {
                let aabb = surface.aabb;
                let vec = _i_mesh_add_surface_from_data_vec3.set(0, 0, 0);
                aabb.set(0, 0, 0, 0, 0, 0);
                let vert_length = Math.floor(stride / 4);
                for (let i = 0; i < array_len; i++) {
                    if (i === 0) {
                        aabb.set(
                            vertices[0],
                            vertices[1],
                            vertices[2],
                            SMALL_VEC3.x,
                            SMALL_VEC3.y,
                            SMALL_VEC3.z
                        );
                    } else {
                        aabb.expand_to(vec.set(
                            vertices[i * vert_length + 0],
                            vertices[i * vert_length + 1],
                            vertices[i * vert_length + 2]
                        ))
                    }
                }
            } else {
                // @Incomplete: calculate 2D AABB (Rect2)
            }
        } else {
            surface.aabb.copy(p_aabb);
        }

        if (VSG.config.vao) {
            const gl_ext = OS.get_singleton().gl_ext;

            // VAO begin
            surface.vao_id = gl_ext.createVertexArray();
            gl_ext.bindVertexArray(surface.vao_id);

            // - vertex buffer
            surface.vertex_id = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.vertex_id);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

            // - index buffer
            if (indices) {
                surface.index_id = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.index_id);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
            }

            // - layout
            for (let i = 0; i < ARRAY_MAX; i++) {
                let attr = surface.attribs[i];
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

            // VAO end
            if (VSG.config.vao) {
                gl_ext.bindVertexArray(null);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        } else {
            // - vertex buffer
            surface.vertex_id = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, surface.vertex_id);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            // - index buffer
            if (indices) {
                surface.index_id = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.index_id);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }
        }

        mesh.surfaces.push(surface);
    }

    /**
     * @param {Mesh_t} mesh
     * @param {number} surface
     * @param {Material_t} material
     */
    mesh_surface_set_material(mesh: Mesh_t, surface: number, material: Material_t) {
        if (mesh.surfaces[surface].material === material) return;

        mesh.surfaces[surface].material = material;
    }

    mesh_get_aabb(mesh: Mesh_t, r_out?: AABB) {
        if (!r_out) r_out = AABB.new();

        for (let i = 0; i < mesh.surfaces.length; i++) {
            if (i === 0) {
                r_out.copy(mesh.surfaces[i].aabb);
            } else {
                r_out.merge_with(mesh.surfaces[i].aabb);
            }
        }
        return r_out;
    }

    /**
     * @param {Mesh_t} mesh
     */
    mesh_get_surface_count(mesh: Mesh_t) {
        return mesh.surfaces.length;
    }

    multimesh_create() {
        return new MultiMesh_t;
    }
    /**
     * @param {MultiMesh_t} multimesh
     */
    multimesh_free(multimesh: MultiMesh_t) {
        const gl = this.gl;

        if (multimesh.buffer) {
            gl.deleteBuffer(multimesh.buffer);
            if (multimesh.data) {
                free_float32array(multimesh.data);
            }
            multimesh.buffer = null;
            multimesh.data = null;
        }

        multimesh.mesh = null;

        if (multimesh.update_list.in_list()) {
            this.multimesh_update_list.remove(multimesh.update_list);
        }
    }
    /**
     * @param {MultiMesh_t} multimesh
     * @param {number} instances
     * @param {number} transform_format
     * @param {number} color_format
     * @param {number} data_format
     */
    multimesh_allocate(multimesh: MultiMesh_t, instances: number, transform_format: number, color_format: number, data_format: number) {
        if (
            multimesh.size === instances
            &&
            multimesh.transform_format === transform_format
            &&
            multimesh.color_format === color_format
            &&
            multimesh.custom_data_format === data_format
        ) {
            return;
        }

        const gl = this.gl;

        if (multimesh.buffer) {
            gl.deleteBuffer(multimesh.buffer);
            if (multimesh.data) {
                free_float32array(multimesh.data);
            }
            multimesh.buffer = null;
            multimesh.data = null;
        }

        multimesh.size = instances;
        multimesh.transform_format = transform_format;
        multimesh.color_format = color_format;
        multimesh.custom_data_format = data_format;

        if (multimesh.size) {
            if (multimesh.transform_format === MULTIMESH_TRANSFORM_2D) {
                multimesh.xform_floats = 8;
            } else {
                multimesh.xform_floats = 12;
            }

            if (multimesh.color_format === MULTIMESH_COLOR_8BIT) {
                multimesh.color_floats = 1;
            } else if (multimesh.color_format === MULTIMESH_COLOR_FLOAT) {
                multimesh.color_floats = 4;
            } else {
                multimesh.color_floats = 0;
            }

            if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_8BIT) {
                multimesh.custom_data_floats = 1;
            } else if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_FLOAT) {
                multimesh.custom_data_floats = 4;
            } else {
                multimesh.custom_data_floats = 0;
            }

            const format_floats = multimesh.color_floats + multimesh.xform_floats + multimesh.custom_data_floats;

            multimesh.data = new_float32array(format_floats * instances);
            const data = multimesh.data;

            const c = _i_multimesh_allocate_color;
            const c_8bit = c.set(1, 1, 1, 1).as_rgba8();
            const d_8bit = c.set(0, 0, 0, 0).as_rgba8();

            for (let i = 0, len = instances * format_floats; i < len; i += format_floats) {
                let color_from = 0;
                let custom_data_from = 0;

                if (multimesh.transform_format === MULTIMESH_TRANSFORM_2D) {
                    data[i + 0] = 1.0;
                    data[i + 1] = 0.0;
                    data[i + 2] = 0.0;
                    data[i + 3] = 0.0;
                    data[i + 4] = 0.0;
                    data[i + 5] = 1.0;
                    data[i + 6] = 0.0;
                    data[i + 7] = 0.0;
                    color_from = 8;
                    custom_data_from = 8;
                } else {
                    data[i + 0] = 1.0;
                    data[i + 1] = 0.0;
                    data[i + 2] = 0.0;
                    data[i + 3] = 0.0;
                    data[i + 4] = 0.0;
                    data[i + 5] = 1.0;
                    data[i + 6] = 0.0;
                    data[i + 7] = 0.0;
                    data[i + 8] = 0.0;
                    data[i + 9] = 0.0;
                    data[i + 10] = 1.0;
                    data[i + 11] = 0.0;
                    color_from = 12;
                    custom_data_from = 12;
                }

                if (multimesh.color_format === MULTIMESH_COLOR_8BIT) {
                    data[i + color_from + 0] = c_8bit;
                    custom_data_from = color_from + 1;
                } else if (multimesh.color_format === MULTIMESH_COLOR_FLOAT) {
                    data[i + color_from + 0] = 1.0;
                    data[i + color_from + 1] = 1.0;
                    data[i + color_from + 2] = 1.0;
                    data[i + color_from + 3] = 1.0;
                    custom_data_from = color_from + 1;
                }

                if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_8BIT) {
                    data[i + custom_data_from + 0] = d_8bit;
                } else if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_FLOAT) {
                    data[i + custom_data_from + 0] = 0.0;
                    data[i + custom_data_from + 1] = 0.0;
                    data[i + custom_data_from + 2] = 0.0;
                    data[i + custom_data_from + 3] = 0.0;
                }
            }

            multimesh.buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, multimesh.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, multimesh.data, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        multimesh.dirty_data = true;
        multimesh.dirty_aabb = true;

        if (!multimesh.update_list.in_list()) {
            this.multimesh_update_list.add(multimesh.update_list);
        }
    }
    /**
     * @param {MultiMesh_t} multimesh
     * @param {Mesh_t} mesh
     */
    multimesh_set_mesh(multimesh: MultiMesh_t, mesh: Mesh_t) {
        if (multimesh.mesh) {
            multimesh.mesh.multimeshes.remove(multimesh.mesh_list);
        }

        multimesh.mesh = mesh;

        if (multimesh.mesh && mesh) {
            mesh.multimeshes.add(multimesh.mesh_list);
        }

        if (!multimesh.update_list.in_list()) {
            this.multimesh_update_list.add(multimesh.update_list);
        }
    }
    /**
     * @param {MultiMesh_t} multimesh
     * @param {number[]} p_array
     */
    multimesh_set_as_bulk_array(multimesh: MultiMesh_t, p_array: number[]) {
        const dsize = multimesh.data.length;
        const data = multimesh.data;

        for (let i = 0; i < dsize; i++) {
            data[i] = p_array[i];
        }

        multimesh.dirty_data = true;
        multimesh.dirty_aabb = true;

        if (!multimesh.update_list.in_list()) {
            this.multimesh_update_list.add(multimesh.update_list);
        }
    }

    /* Light API */

    /**
     * @param {number} p_type
     */
    light_create(p_type: number) {
        let light = new Light_t;
        light.type = p_type;
        return light;
    }

    /**
     * @param {Light_t} p_light
     * @param {ColorLike} p_color
     */
    light_set_color(p_light: Light_t, p_color: ColorLike) {
        p_light.color.copy(p_color);
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_param
     * @param {number} p_value
     */
    light_set_param(p_light: Light_t, p_param: number, p_value: number) {
        switch (p_param) {
            case LIGHT_PARAM_RANGE:
            case LIGHT_PARAM_SPOT_ANGLE:
            case LIGHT_PARAM_SHADOW_MAX_DISTANCE:
            case LIGHT_PARAM_SHADOW_SPLIT_1_OFFSET:
            case LIGHT_PARAM_SHADOW_SPLIT_2_OFFSET:
            case LIGHT_PARAM_SHADOW_SPLIT_3_OFFSET:
            case LIGHT_PARAM_SHADOW_NORMAL_BIAS:
            case LIGHT_PARAM_SHADOW_BIAS: {
                p_light.version++;
                p_light.instance_change_notify(true, false);
            } break;
        }
        p_light.param[p_param] = p_value;
    }

    /**
     * @param {Light_t} p_light
     * @param {Texture_t} p_texture
     */
    light_set_projector(p_light: Light_t, p_texture: Texture_t) {
        p_light.projector = p_texture;
    }

    /**
     * @param {Light_t} p_light
     * @param {boolean} p_enable
     */
    light_set_negative(p_light: Light_t, p_enable: boolean) {
        p_light.negative = p_enable;
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_mask
     */
    light_set_cull_mask(p_light: Light_t, p_mask: number) {
        p_light.cull_mask = p_mask;

        p_light.version++;
        p_light.instance_change_notify(true, false);
    }

    /**
     * @param {Light_t} p_light
     * @param {boolean} p_enabled
     */
    light_set_reverse_cull_face_mode(p_light: Light_t, p_enabled: boolean) {
        p_light.reverse_cull = p_enabled;

        p_light.version++;
        p_light.instance_change_notify(true, false);
    }

    /**
     * @param {Light_t} p_light
     * @param {boolean} p_enable
     */
    light_set_shadow(p_light: Light_t, p_enable: boolean) {
        p_light.shadow = p_enable;
        p_light.version++;
    }

    /**
     * @param {Light_t} p_light
     * @param {ColorLike} p_color
     */
    light_set_shadow_color(p_light: Light_t, p_color: ColorLike) {
        p_light.shadow_color.copy(p_color);
    }

    /**
     * @param {Light_t} p_light
     * @param {boolean} p_enabled
     */
    light_directional_set_blend_splits(p_light: Light_t, p_enabled: boolean) {
        p_light.directional_blend_splits = p_enabled;
        p_light.version++;
        p_light.instance_change_notify(true, false);
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_mode
     */
    light_directional_set_shadow_mode(p_light: Light_t, p_mode: number) {
        p_light.directional_shadow_mode = p_mode;
        p_light.version++;
        p_light.instance_change_notify(true, false);
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_range
     */
    light_directional_set_shadow_depth_range(p_light: Light_t, p_range: number) {
        p_light.directional_range_mode = p_range;
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_mode
     */
    light_omni_set_shadow_mode(p_light: Light_t, p_mode: number) {
        p_light.omni_shadow_mode = p_mode;
        p_light.version++;
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_detail
     */
    light_omni_set_shadow_detail(p_light: Light_t, p_detail: number) {
        p_light.omni_shadow_detail = p_detail;
        p_light.version++;
        p_light.instance_change_notify(true, false);
    }

    light_get_aabb(p_light: Light_t, r_out?: AABB) {
        if (!r_out) r_out = AABB.new();

        switch (p_light.type) {
            case LIGHT_SPOT: {
                let len = p_light.param[LIGHT_PARAM_RANGE];
                let size = Math.tan(deg2rad(p_light.param[LIGHT_PARAM_SPOT_ANGLE])) * len;
                return r_out.set(-size, -size, -len, size * 2, size * 2, len);
            };
            case LIGHT_OMNI: {
                let r = p_light.param[LIGHT_PARAM_RANGE];
                return r_out.set(-r, -r, -r, r * 2, r * 2, r * 2);
            };
            case LIGHT_DIRECTIONAL: {
                return r_out.set(0, 0, 0, 0, 0, 0);
            };
        }

        return r_out.set(0, 0, 0, 0, 0, 0);
    }

    /* light map API */

    lightmap_capture_create() {
        return new LightmapCapture_t;
    }

    /**
     * @param {LightmapCapture_t} p_capture
     * @param {AABB} p_bounds
     */
    lightmap_capture_set_bounds(p_capture: LightmapCapture_t, p_bounds: AABB) {
        p_capture.bounds.copy(p_bounds)
        p_capture.instance_change_notify(true, false);
    }

    lightmap_capture_get_bounds(p_capture: LightmapCapture_t, r_out?: AABB) {
        return (r_out || AABB.new()).copy(p_capture.bounds);
    }

    /* skeleton API */

    skeleton_create() {
        let skeleton = new Skeleton_t;
        return skeleton;
    }

    /**
     * @param {Skeleton_t} p_skeleton
     * @param {number} p_bones
     */
    skeleton_allocate(p_skeleton: Skeleton_t, p_bones: number) {
        p_skeleton.size = p_bones;

        if (!VSG.config.use_skeleton_software) {
            const gl = this.gl;

            p_skeleton.gl_tex = this.gl.createTexture();

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, p_skeleton.gl_tex);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, p_bones * 3, 1, 0, gl.RGBA, gl.FLOAT, null);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        p_skeleton.bone_data = new Float32Array(p_bones * 4 * 3);
    }

    /**
     * @param {Skeleton_t} p_skeleton
     * @param {number} p_bones
     * @param {Transform} p_transform
     */
    skeleton_bone_set_transform(p_skeleton: Skeleton_t, p_bones: number, p_transform: Transform) {
        let bone_data = p_skeleton.bone_data;
        let base_offset = p_bones * 4 * 3;

        bone_data[base_offset + 0] = p_transform.basis.elements[0].x;
        bone_data[base_offset + 1] = p_transform.basis.elements[0].y;
        bone_data[base_offset + 2] = p_transform.basis.elements[0].z;
        bone_data[base_offset + 3] = p_transform.origin.x;

        bone_data[base_offset + 4] = p_transform.basis.elements[1].x;
        bone_data[base_offset + 5] = p_transform.basis.elements[1].y;
        bone_data[base_offset + 6] = p_transform.basis.elements[1].z;
        bone_data[base_offset + 7] = p_transform.origin.y;

        bone_data[base_offset + 8] = p_transform.basis.elements[2].x;
        bone_data[base_offset + 9] = p_transform.basis.elements[2].y;
        bone_data[base_offset + 10] = p_transform.basis.elements[2].z;
        bone_data[base_offset + 11] = p_transform.origin.z;

        if (!p_skeleton.update_list.in_list()) {
            this.skeleton_update_list.add(p_skeleton.update_list);
        }
    }

    /**
     * @param {Skeleton_t} p_skeleton
     * @param {Instance_t} p_instance
     */
    instance_add_skeleton(p_skeleton: Skeleton_t, p_instance: Instance_t) {
        p_skeleton.instances.add(p_instance);
    }

    /**
     * @param {Skeleton_t} p_skeleton
     * @param {Instance_t} p_instance
     */
    instance_remove_skeleton(p_skeleton: Skeleton_t, p_instance: Instance_t) {
        p_skeleton.instances.delete(p_instance);
    }

    /**
     * @param {number[]} p_data
     * @param {number} p_size
     */
    _update_skeleton_transform_buffer(p_data: number[], p_size: number) { }

    /* sky API */

    sky_create() {
        return new Sky_t;
    }

    /**
     * @param {Sky_t} p_sky
     * @param {Texture_t} p_panorama
     * @param {number} p_radiance_size
     */
    sky_set_texture(p_sky: Sky_t, p_panorama: Texture_t, p_radiance_size: number) {
        /*
        const gl = this.gl;

        if (p_sky.panorama) {
            gl.deleteTexture(p_sky.radiance);
            p_sky.radiance = null;
        }

        p_sky.panorama = p_panorama;
        if (!p_sky.panorama) return;

        let texture = p_sky.panorama;
        if (!texture) {
            p_sky.panorama = null;
        }

        {
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.SCISSOR_TEST);
            gl.disable(gl.BLEND);

            for (let i = 0; i < ARRAY_MAX; i++) {
                gl.disableVertexAttribArray(i);
            }
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(texture.target, texture.gl_tex);

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.resources.radical_inverse_vdc_cache_tex);

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.activeTexture(gl.TEXTURE2);
        p_sky.radiance = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, p_sky.radiance);

        let size = Math.floor(p_radiance_size / 2);

        let internal_format = gl.RGB;
        let format = gl.RGB;
        let type = gl.UNSIGNED_BYTE;

        for (let i = 0; i < 6; i++) {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, internal_format, size, size, 0, format, type, null);
        }

        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.resources.mipmap_blur_fbo);

        let mipmaps = 6;
        let lod = 0;
        let mm_level = mipmaps;
        size = Math.floor(p_radiance_size / 2);
        let cubemap_filter = this.shaders.cubemap_filter;

        cubemap_filter.set_conditional("USE_SOURCE_PANORAMA", true);
        cubemap_filter.set_conditional("USE_DIRECT_WRITE", true);
        cubemap_filter.bind();

        while (size >= 1) {
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, this.resources.mipmap_blur_color);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.resources.mipmap_blur_color, 0);

            if (lod === 1) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, p_sky.radiance);
                cubemap_filter.set_conditional("USE_SOURCE_PANORAMA", false);
                cubemap_filter.set_conditional("USE_DIRECT_WRITE", false);
                cubemap_filter.bind();
            }
            gl.viewport(0, 0, size, size);
            this.bind_quad_array();

            gl.activeTexture(gl.TEXTURE2);

            for (let i = 0; i < 6; i++) {
                cubemap_filter.set_uniform_int("face_id", i);

                let roughness = mm_level >= 0 ? lod / (mipmaps - 1) : 1;
                roughness = Math.min(1.0, roughness);
                cubemap_filter.set_uniform_float("roughness", roughness);

                gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

                gl.copyTexSubImage2D(_cube_side_enum[i], lod, 0, 0, 0, 0, size, size);
            }

            size >>= 1;

            mm_level--;

            lod++;
        }

        cubemap_filter.set_conditional("USE_SOURCE_PANORAMA", false);
        cubemap_filter.set_conditional("USE_DIRECT_WRITE", false);

        gl.activeTexture(gl.TEXTURE2);

        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameterf(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        */
    }

    /* others */

    /**
     * @param {Instantiable_t} p_base
     * @param {Instance_t} p_instance
     */
    instance_add_dependency(p_base: Instantiable_t, p_instance: Instance_t) {
        p_base.instance_list.add(p_instance.dependency_item);
    }

    /**
     * @param {number} type
     * @param {number} size
     * @param {number} [usage]
     */
    buffer_create(type: number, size: number, usage: number = WebGLRenderingContext.STREAM_DRAW) {
        const gl = this.gl;

        const size_po2 = next_power_of_2(size);
        const buffers = this.buffers[size_po2] = this.buffers[size_po2] || [];
        const buffer = buffers.pop() || {
            size: size_po2,
            gl_buf: gl.createBuffer(),
        }
        gl.bindBuffer(type, buffer.gl_buf);
        gl.bufferData(type, buffer.size, usage);
        return buffer;
    }
}

const _i_mesh_add_surface_from_data_vec3 = new Vector3;

const _i_multimesh_allocate_color = new Color;
