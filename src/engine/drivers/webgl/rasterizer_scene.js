import { Vector2 } from 'engine/core/math/vector2';
import { Vector3 } from 'engine/core/math/vector3';
import { Rect2 } from 'engine/core/math/rect2';
import { Transform } from 'engine/core/math/transform';
import { CameraMatrix } from 'engine/core/math/camera_matrix';
import { Color } from 'engine/core/color';
import { OS } from 'engine/core/os/os';

import {
    INSTANCE_TYPE_MESH,
    INSTANCE_TYPE_MULTIMESH,
    INSTANCE_TYPE_IMMEDIATE,
    LIGHT_DIRECTIONAL,
    LIGHT_PARAM_ENERGY,
    LIGHT_PARAM_SPECULAR,
    LIGHT_OMNI,
} from 'engine/servers/visual_server';
import {
    Instance_t,
} from 'engine/servers/visual/visual_server_scene';
import { VSG } from 'engine/servers/visual/visual_server_globals';

import {
    ShaderMaterial,
    SPATIAL_SHADER_UNIFORMS,
} from 'engine/scene/resources/material';

import {
    Mesh_t,
    Surface_t,
    Geometry_t,
    Texture_t,
    Material_t,
    Light_t,

    BLEND_MODE_MIX,
    BLEND_MODE_ADD,
    BLEND_MODE_SUB,
    BLEND_MODE_MUL,
    CULL_MODE_FRONT,
    CULL_MODE_BACK,
    CULL_MODE_DISABLED,
    DEPTH_DRAW_OPAQUE,
    DEPTH_DRAW_ALPHA_PREPASS,
} from './rasterizer_storage';

import normal_vs from './shaders/spatial.vert';
import normal_fs from './shaders/spatial.frag';

export const ENV_BG_CLEAR_COLOR = 0;
export const ENV_BG_COLOR = 1;
export const ENV_BG_SKY = 2;
export const ENV_BG_COLOR_SKY = 3;
export const ENV_BG_CANVAS = 4;
export const ENV_BG_KEEP = 5;
export const ENV_BG_CAMERA_FEED = 6;

const ARRAY_VERTEX = 0;
const ARRAY_NORMAL = 1;
const ARRAY_TANGENT = 2;
const ARRAY_COLOR = 3;
const ARRAY_UV = 4;
const ARRAY_UV2 = 5;
const ARRAY_MAX = 6;

const MAX_LIGHTS = 255;

export const LIGHTMODE_NORMAL = 0;
export const LIGHTMODE_UNSHADED = 1;
export const LIGHTMODE_LIGHTMAP = 2;
export const LIGHTMODE_LIGHTMAP_CAPTURE = 3;

export class Environment_t {
    constructor() {
        this.bg_mode = ENV_BG_CLEAR_COLOR;

        this.bg_energy = [1.0];
        this.bg_color = [0, 0, 0, 1];
        this.ambient_energy = [1.0];
        this.ambient_color = [0, 0, 0, 1];
    }
}

export class LightInstance_t {
    constructor() {
        /** @type {Light_t} */
        this.light = null;

        this.transform = new Transform;

        this.light_vector = new Vector3;
        this.spot_vector = new Vector3;
        this.linear_att = 0;

        this.last_scene_pass = 0;

        this.light_index = 0;
        this.light_directional_index = 0;

        this.directional_rect = new Rect2;
    }
}

/**
 * @param {Element_t} a
 * @param {Element_t} b
 */
const sort_by_key = (a, b) => {
    if (a.depth_layer + a.priority === b.depth_layer + b.priority) {
        return (a.geometry_index*14 + a.light_index*8 + a.light_type1 + a.light_type2 + a.light_mode*2 + a.material_index*10)
            -
            (b.geometry_index * 14 + b.light_index * 8 + b.light_type1 + b.light_type2 + b.light_mode * 2 + b.material_index * 10)
    } else {
        return (a.depth_layer + a.priority) - (b.depth_layer + b.priority);
    }
}

/**
 * @param {Element_t} a
 * @param {Element_t} b
 */
const sort_by_reverse_depth_and_priority = (a, b) => {
    if (a.priority === b.priority) {
        return a.instance.depth - b.instance.depth;
    } else {
        return a.priority - b.priority;
    }
}

class Element_t {
    get use_accum() {
        return this.use_accum_ptr.value
    }
    set use_accum(value) {
        this.use_accum_ptr.value = value;
    }

    constructor() {
        /** @type {Instance_t} */
        this.instance = null;

        /** @type {Geometry_t} */
        this.geometry = null;

        /** @type {Material_t} */
        this.material = null;

        /** @type {{ value: boolean }} */
        this.use_accum_ptr = { value: false };
        this.front_facing = true;

        this.depth_layer = 0;
        this.priority = 0;
        this.geometry_index = 0;
        this.material_index = 0;
        this.light_index = 0;
        this.light_type1 = 0;
        this.light_type2 = 0;
        this.light_mode = 0;
    }
    /**
     * @param {Element_t} other
     */
    copy(other) {
        this.instance = other.instance;
        this.geometry = other.geometry;
        this.material = other.material;

        this.use_accum_ptr = other.use_accum_ptr;
        this.front_facing = other.front_facing;

        this.depth_layer = other.depth_layer;
        this.priority = other.priority;
        this.geometry_index = other.geometry_index;
        this.material_index = other.material_index;
        this.light_index = other.light_index;

        return this;
    }
}

class RenderList_t {
    constructor() {
        this.max_elements = 65536;

        /** @type {Element_t[]} */
        this.base_elements = [];
        /** @type {Element_t[]} */
        this.elements = [];

        this.element_count = 0;
        this.alpha_element_count = 0;
    }

    init() {
        this.element_count = 0;
        this.alpha_element_count = 0;

        this.elements.length = 0;
        this.base_elements.length = this.max_elements;

        for (let i = 0; i < this.max_elements; i++) {
            this.base_elements[i] = new Element_t;
        }
    }

    clear() {
        this.element_count = 0;
        this.alpha_element_count = 0;
    }

    add_alpha_element() {
        if (this.element_count + this.alpha_element_count >= this.max_elements) return null;

        let idx = this.max_elements - this.alpha_element_count - 1;
        this.elements[idx] = this.base_elements[this.element_count];
        this.alpha_element_count++;
        return this.elements[idx];
    }

    add_element() {
        if (this.element_count + this.alpha_element_count >= this.max_elements) return null;

        this.elements[this.element_count] = this.base_elements[this.element_count];
        return this.elements[this.element_count++];
    }

    /**
     * @param {boolean} p_alpha
     */
    sort_by_key(p_alpha) {
        if (p_alpha) {
            let list = this.elements.slice(this.max_elements - this.alpha_element_count);
            list.sort(sort_by_key);
            for (let i = 0; i < list.length; i++) {
                this.elements[this.alpha_element_count + i] = list[i];
            }
        } else {
            this.elements.sort(sort_by_key)
        }
    }

    /**
     * @param {boolean} p_alpha
     */
    sort_by_reverse_depth_and_priority(p_alpha) {
        if (p_alpha) {
            let list = this.elements.slice(this.max_elements - this.alpha_element_count);
            list.sort(sort_by_reverse_depth_and_priority);
            for (let i = 0; i < list.length; i++) {
                this.elements[this.alpha_element_count + i] = list[i];
            }
        } else {
            this.elements.sort(sort_by_reverse_depth_and_priority);
        }
    }
}

export class RasterizerScene {
    constructor() {
        /** @type {import('./rasterizer_storage').RasterizerStorage} */
        this.storage = null;

        // private
        this.gl = null;

        this.materials = {
            /** @type {Material_t} */
            spatial: null,
        }

        /** @type {LightInstance_t[]} */
        this.render_light_instances = [];
        this.render_directional_lights = 0;
        this.render_light_instance_count = 0;

        this.state = {
            cull_disabled: false,
            cull_front: false,

            used_screen_texture: false,
            viewport_size: new Vector2,
            screen_pixel_size: new Vector2,

            default_bg: new Color(0, 0, 0, 1),
            default_ambient: new Color(0, 0, 0, 1),

            /** @type {WebGLTexture} */
            current_main_tex: null,

            /** @type {Object<string, number[]>} */
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
                WORLD_MATRIX: [
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

                bg_color: [0, 0, 0, 1],
                bg_energy: [1],
                ambient_color: [0, 0, 0, 1],
                ambient_energy: [1],
            },

            /** @type {{ [key: string]: Texture_t }} */
            textures: {},
        };

        this.render_list = new RenderList_t;

        this.scene_pass = 0;
        this.render_pass = 0;

        this.current_material_index = 0;
        this.current_geometry_index = 0;
        this.current_shader_index = 0;
    }

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl) {
        this.gl = gl;

        this.render_list.init();

        this.render_pass = 1;

        {
            /* default material */

            const mat = new ShaderMaterial("normal");
            mat.set_shader(`
                shader_type = spatial;
                void fragment() {
                    vec4 albedo = texture(texture_albedo, UV);
                    ALBEDO = albedo.rgb;
                }
            `);
            this.materials.spatial = this.init_shader_material(mat, normal_vs, normal_fs, SPATIAL_SHADER_UNIFORMS, true);

            this.materials.spatial.params["albedo"] = [1, 1, 1, 1];
            this.materials.spatial.params["specular"] = [0.5];
            this.materials.spatial.params["metallic"] = [0];
            this.materials.spatial.params["roughness"] = [1];
        }

        gl.frontFace(gl.CW);
    }

    free_rid(p_rid) {
        return false;
    }

    iteration() { }

    /**
     * @param {number} p_pass
     */
    set_scene_pass(p_pass) {
        this.scene_pass = p_pass;
    }

    /**
     * @param {Light_t} p_light
     */
    light_instance_create(p_light) {
        let light_instance = new LightInstance_t;
        light_instance.light = p_light;
        light_instance.light_index = 0xFFFF;
        return light_instance;
    }

    /**
     * @param {LightInstance_t} p_light
     * @param {Transform} p_transform
     */
    light_instance_set_transform(p_light, p_transform) {
        p_light.transform.copy(p_transform);
    }

    /**
     * @param {Transform} p_cam_transform
     * @param {CameraMatrix} p_cam_projection
     * @param {boolean} p_cam_ortho
     * @param {Instance_t[]} p_cull_result
     * @param {number} p_cull_count
     * @param {LightInstance_t[]} p_light_cull_result
     * @param {number} p_light_cull_count
     * @param {Environment_t} p_env
     */
    render_scene(p_cam_transform, p_cam_projection, p_cam_ortho, p_cull_result, p_cull_count, p_light_cull_result, p_light_cull_count, p_env) {
        let cam_transform = p_cam_transform.clone();

        let viewport_width = 0, viewport_height = 0;
        let viewport_x = 0, viewport_y = 0;
        let reverse_cull = false;

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.VFLIP) {
            let negate_axis = cam_transform.basis.get_axis(1).negate();
            cam_transform.basis.set_axis(1, negate_axis);
            reverse_cull = true;
            Vector3.free(negate_axis);
        }

        let current_fb = this.storage.frame.current_rt.gl_fbo;

        viewport_width = this.storage.frame.current_rt.width;
        viewport_height = this.storage.frame.current_rt.height;
        viewport_x = this.storage.frame.current_rt.x;

        if (this.storage.frame.current_rt.flags.DIRECT_TO_SCREEN) {
            viewport_y = OS.get_singleton().get_window_size().height - viewport_height - this.storage.frame.current_rt.y;
        } else {
            viewport_y = this.storage.frame.current_rt.y;
        }

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
                let light = /** @type {LightInstance_t} */(p_light_cull_result[i]);

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
        this._fill_render_list(p_cull_result, p_cull_count, false);

        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, current_fb);
        gl.viewport(viewport_x, viewport_y, viewport_width, viewport_height);

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.DIRECT_TO_SCREEN) {
            gl.scissor(viewport_x, viewport_y, viewport_width, viewport_height);
            gl.enable(gl.SCISSOR_TEST);
        }

        gl.depthMask(true);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.DEPTH_TEST);

        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // clear color

        let clear_color = Color.new(0, 0, 0, 1);

        if (this.storage.frame.current_rt && this.storage.frame.current_rt.flags.TRANSPARENT) {
            clear_color.set(0, 0, 0, 0);
            this.storage.frame.clear_request = false;
        } else if (!p_env || p_env.bg_mode === ENV_BG_CLEAR_COLOR || p_env.bg_mode === ENV_BG_SKY) {
            if (this.storage.frame.clear_request) {
                // TODO: env support
                // clear_color.copy(this.storage.frame.clear_request_color);
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

        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        if (p_env) {
            switch (p_env.bg_mode) {
                case ENV_BG_COLOR_SKY:
                case ENV_BG_SKY: {
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
        this._render_render_list(this.render_list.elements, this.render_list.element_count, cam_transform, p_cam_projection, p_env, false);

        // TODO: draw sky

        if (this.storage.frame.current_rt && this.state.used_screen_texture) {
            // copy screen texture

            this.storage.canvas._copy_screen(Rect2.EMPTY);
        }

        // alpha pass second
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        this.render_list.sort_by_reverse_depth_and_priority(true);
        this._render_render_list(this.render_list.elements, this.render_list.alpha_element_count, cam_transform, p_cam_projection, p_env, true);

        this._post_process(p_env, p_cam_projection);

        Color.free(clear_color);
        Transform.free(cam_transform);
    }

    /**
     * @param {ShaderMaterial} shader_material
     * @param {string} vs
     * @param {string} fs
     * @param {{ name: string, type: string }[]} uniforms
     * @param {boolean} batchable
     */
    init_shader_material(shader_material, vs, fs, uniforms, batchable) {
        const gl = this.gl;

        const vs_code = vs
            // uniform
            .replace("/* UNIFORM */", shader_material.vs_uniform_code)
            // shader code
            .replace("/* SHADER */", `{\n${shader_material.vs_code}}`)
        const fs_code = fs
            // uniform
            .replace("/* UNIFORM */", shader_material.fs_uniform_code)
            // shader code
            .replace(/\/\* SHADER_BEGIN \*\/([\s\S]*?)\/\* SHADER_END \*\//, `{\n${shader_material.fs_code}}`)
            // translate Godot API to GLSL
            .replace(/texture\(/gm, "texture2D(")
            .replace(/FRAGCOORD/gm, "gl_FragCoord")
        const shader = VSG.storage.shader_create(
            vs_code, fs_code,
            [
                'position',
                'normal',
                'tangent',
                'uv',
            ],
            // @ts-ignore
            [
                ...SPATIAL_SHADER_UNIFORMS,
                ...uniforms,
                ...shader_material.uniforms,
            ]
        );
        const material = VSG.storage.material_create(shader, undefined, shader_material.uses_screen_texture);
        material.name = shader_material.name;
        material.batchable = batchable;
        for (let u of shader_material.uniforms) {
            if (u.value) {
                material.params[u.name] = u.value;
            }
        }
        return material;
    }

    /**
     * @param {WebGLTexture} p_texture
     * @param {WebGLFramebuffer} p_buffer
     */
    _copy_texture_to_buffer(p_texture, p_buffer) {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, p_buffer);

        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);
        gl.colorMask(true, true, true, true);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, p_texture);

        gl.viewport(0, 0, this.storage.frame.current_rt.width, this.storage.frame.current_rt.height);

        this.storage.bind_copy_shader();
        this.storage.bind_quad_array();
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * @param {Instance_t[]} p_cull_result
     * @param {number} p_cull_count
     * @param {boolean} p_depth_pass
     */
    _fill_render_list(p_cull_result, p_cull_count, p_depth_pass) {
        this.render_pass++;
        this.current_material_index = 0;
        this.current_geometry_index = 0;
        this.current_shader_index = 0;

        for (let i = 0; i < p_cull_count; i++) {
            let inst = p_cull_result[i];

            switch (inst.base_type) {
                case INSTANCE_TYPE_MESH: {
                    let mesh = /** @type {Mesh_t} */(inst.base);
                    let num_surfaces = mesh.surfaces.length;
                    for (let j = 0; j < num_surfaces; j++) {
                        let material_idx = inst.materials[j] ? j : -1;
                        let surface = mesh.surfaces[j];
                        this._add_geometry(surface, inst, material_idx, p_depth_pass);
                    }
                } break;
                case INSTANCE_TYPE_MULTIMESH: {
                } break;
                case INSTANCE_TYPE_IMMEDIATE: {
                } break;
            }
        }
    }

    /**
     * @param {Geometry_t} p_geometry
     * @param {Instance_t} p_instance
     * @param {number} p_material
     * @param {boolean} p_depth_pass
     */
    _add_geometry(p_geometry, p_instance, p_material, p_depth_pass) {
        /** @type {Material_t} */
        let material = null;

        if (p_instance.materail_override) {
            material = p_instance.materail_override;
        } else if (p_material > 0) {
            material = p_instance.materials[p_material];
        } else {
            material = p_geometry.material;
        }

        if (!material) {
            material = this.materials.spatial;
        }

        this._add_geometry_with_material(p_geometry, p_instance, material, p_depth_pass);

        while (material.next_pass) {
            material = material.next_pass;

            if (!material || !material.shader) {
                break;
            }

            this._add_geometry_with_material(p_geometry, p_instance, material, p_depth_pass);
        }
    }

    /**
     * @param {Geometry_t} p_geometry
     * @param {Instance_t} p_instance
     * @param {Material_t} p_material
     * @param {boolean} p_depth_pass
     */
    _add_geometry_with_material(p_geometry, p_instance, p_material, p_depth_pass) {
        let has_base_alpha = false;
        let has_blend_alpha = false;
        let has_alpha = has_base_alpha || has_blend_alpha;

        let mirror = p_instance.mirror;

        if (p_material.shader.spatial.uses_screen_texture) {
            this.state.used_screen_texture = true;
        }

        if (p_depth_pass) {
            has_alpha = false;
        }

        let e = (has_alpha || p_material.shader.spatial.no_depth_test) ? this.render_list.add_alpha_element() : this.render_list.add_element();

        if (!e) return;

        e.geometry = p_geometry;
        e.material = p_material;
        e.instance = p_instance;
        e.use_accum = false;
        e.front_facing = false;
        e.light_index = MAX_LIGHTS;

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
                } else if (e.instance.lightmap_capture_data) {
                    e.light_mode = LIGHTMODE_LIGHTMAP_CAPTURE;
                } else {
                    e.light_mode = LIGHTMODE_NORMAL;
                }
            }
        }
    }

    /**
     * @param {Element_t[]} p_elements
     * @param {number} p_element_count
     * @param {Transform} p_view_transform
     * @param {CameraMatrix} p_projection
     * @param {Environment_t} p_env
     * @param {boolean} p_alpha_pass
     */
    _render_render_list(p_elements, p_element_count, p_view_transform, p_projection, p_env, p_alpha_pass) {
        let view_transform_inverse = p_view_transform.inverse();
        let projection_inverse = p_projection.inverse();

        const gl = this.gl;

        /** @type {Material_t} */
        let prev_material = null;
        /** @type {Geometry_t} */
        let prev_geometry = null;

        let prev_unshaded = false;
        let prev_instancing = false;
        let prev_depth_prepass = false;

        let prev_base_pass = false;
        /** @type {LightInstance_t} */
        let prev_light = null;

        let prev_blend_mode = -2;

        this.state.cull_front = false;
        this.state.cull_disabled = false;
        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);

        if (p_alpha_pass) {
            gl.enable(gl.BLEND);
        } else {
            gl.disable(gl.BLEND);
        }

        for (let i = 0; i < p_element_count; i++) {
            let e = p_elements[i];

            let material = e.material;
            let global_uniforms = this.state.uniforms;

            let rebind = false;
            let accum_pass = e.use_accum;
            e.use_accum = true;

            /** @type {LightInstance_t} */
            let light = null;
            let rebind_light = false;

            if (material.shader) {
                let unshaded = material.shader.spatial.unshaded;

                if (unshaded != prev_unshaded) {
                    rebind = true;

                    // TODO: unshaded

                    prev_unshaded = unshaded;
                }

                let base_pass = !accum_pass && !unshaded;

                if (base_pass != prev_base_pass) {
                    rebind = true;
                    prev_base_pass = base_pass;
                }

                if (!unshaded && e.light_index < MAX_LIGHTS) {
                    light = this.render_light_instances[e.light_index];
                }

                if (light != prev_light) {
                    this._setup_light_type(light);
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

                if (prev_blend_mode != blend_mode) {
                    if (prev_blend_mode == -1 && blend_mode != -1) {
                        gl.enable(gl.BLEND);
                    } else if (blend_mode == -1 && prev_blend_mode != -1) {
                        gl.disable(gl.BLEND);
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

                // TODO: lightmap
            }

            let depth_prepass = false;

            let instancing = e.instance.base_type === INSTANCE_TYPE_MULTIMESH;

            if (instancing != prev_instancing) {
                // TODO: instancing
                rebind = true;
            }

            // TODO: skeleton

            if (e.geometry != prev_geometry) {
                this._setup_geometry(e);
            }

            let shader_rebind = false;
            if (rebind || material != prev_material) {
                shader_rebind = this._setup_material(material, p_alpha_pass);
            }

            this._set_cull(e.front_facing, material.shader.spatial.cull_mode === CULL_MODE_DISABLED, false);

            if (i === 0 || shader_rebind) {
                if (p_env) {
                    global_uniforms.bg_energy = p_env.bg_energy;
                    global_uniforms.bg_color = p_env.bg_color;
                    global_uniforms.ambient_color = p_env.ambient_color;
                    global_uniforms.ambient_energy = p_env.ambient_energy;
                } else {
                    global_uniforms.bg_energy[0] = 1.0;
                    global_uniforms.bg_color = this.state.default_bg.as_array(global_uniforms.bg_color);
                    global_uniforms.ambient_color = this.state.default_ambient.as_array(global_uniforms.ambient_color);
                    global_uniforms.ambient_energy[0] = 1.0;
                }

                // TODO: fog

                global_uniforms.CAMERA_MATRIX = p_view_transform.as_array(global_uniforms.CAMERA_MATRIX);
                global_uniforms.INV_CAMERA_MATRIX = view_transform_inverse.as_array(global_uniforms.INV_CAMERA_MATRIX);
                global_uniforms.PROJECTION_MATRIX = p_projection.as_array(global_uniforms.PROJECTION_MATRIX);
                global_uniforms.INV_PROJECTION_MATRIX = projection_inverse.as_array(global_uniforms.INV_PROJECTION_MATRIX);
                global_uniforms.TIME[0] = this.storage.frame.time[0];
                global_uniforms.VIEWPORT_SIZE[0] = this.state.viewport_size.x;
                global_uniforms.VIEWPORT_SIZE[1] = this.state.viewport_size.y;
                global_uniforms.SCREEN_PIXEL_SIZE[0] = this.state.screen_pixel_size.x;
                global_uniforms.SCREEN_PIXEL_SIZE[1] = this.state.screen_pixel_size.y;
            }

            if (rebind_light && light) {
                this._setup_light(light, p_view_transform);
            }

            global_uniforms.WORLD_MATRIX = e.instance.transform.as_array(global_uniforms.WORLD_MATRIX);

            const mat_uniforms = material.shader.uniforms;
            for (const k in mat_uniforms) {
                const u = mat_uniforms[k];
                switch (u.type) {
                    case '1f': gl.uniform1fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] ? global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] : material.params[k]); break;
                    case '2f': gl.uniform2fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] ? global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] : material.params[k]); break;
                    case '3f': gl.uniform3fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] ? global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] : material.params[k]); break;
                    case '4f': gl.uniform4fv(u.gl_loc, global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] ? global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] : material.params[k]); break;
                    case 'mat3': gl.uniformMatrix3fv(u.gl_loc, false, global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] ? global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] : material.params[k]); break;
                    case 'mat4': gl.uniformMatrix4fv(u.gl_loc, false, global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] ? global_uniforms[k] ? global_uniforms[k] : global_uniforms[k] : material.params[k]); break;
                }
            }

            this._render_geometry(e);

            prev_geometry = e.geometry;
            prev_material = e.material;
            prev_light = light;
        }

        Transform.free(view_transform_inverse);
        CameraMatrix.free(projection_inverse);
    }

    /**
     * @param {boolean} p_front
     * @param {boolean} p_disabled
     * @param {boolean} p_reverse_cull
     */
    _set_cull(p_front, p_disabled, p_reverse_cull) {
        const gl = this.gl;

        let front = p_front;
        if (p_reverse_cull) {
            front = !front;
        }

        if (p_disabled !== this.state.cull_disabled) {
            if (p_disabled) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }

            this.state.cull_disabled = p_disabled;
        }

        if (front !== this.state.cull_front) {
            gl.cullFace(front ? gl.FRONT : gl.BACK);
            this.state.cull_front = front;
        }
    }

    /**
     * @param {LightInstance_t} p_light
     */
    _setup_light_type(p_light) {
        if (!p_light) {
            return;
        }
    }

    /**
     * @param {LightInstance_t} p_light
     * @param {Transform} p_view_transform
     */
    _setup_light(p_light, p_view_transform) {
        let uniforms = this.state.uniforms;

        let light = p_light.light;

        // common parameters
        let energy = light.param[LIGHT_PARAM_ENERGY];
        let specular = light.param[LIGHT_PARAM_SPECULAR];
        let sign = light.negative ? -1 : 1;

        uniforms.LIGHT_SPECULAR[0] = specular;

        uniforms.LIGHT_COLOR = light.color.as_array(uniforms.LIGHT_COLOR);
        let sign_energy_PI = sign * energy * Math.PI;
        uniforms.LIGHT_COLOR[0] *= sign_energy_PI;
        uniforms.LIGHT_COLOR[1] *= sign_energy_PI;
        uniforms.LIGHT_COLOR[2] *= sign_energy_PI;
        uniforms.LIGHT_COLOR[3] *= sign_energy_PI;

        // specific parameters
        switch (light.type) {
            case LIGHT_DIRECTIONAL: {
                let direction = Vector3.new(0, 0, -1);
                p_light.transform.basis.xform(direction, direction);
                p_view_transform.basis.xform_inv(direction, direction);
                direction.normalize();

                uniforms.LIGHT_DIRECTION = direction.as_array(uniforms.LIGHT_DIRECTION);

                Vector3.free(direction);
            } break;
        }
    }

    /**
     * @param {Element_t} p_element
     */
    _setup_geometry(p_element) {
        const gl = this.gl;

        switch (p_element.instance.base_type) {
            case INSTANCE_TYPE_MESH: {
                let s = /** @type {Surface_t} */(p_element.geometry);

                gl.bindBuffer(gl.ARRAY_BUFFER, s.vertex_id);

                if (s.index_array_len > 0) {
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.index_id);
                }

                for (let i = 0; i < s.attribs.length; i++) {
                    let attr = s.attribs[i];
                    if (attr.enabled) {
                        gl.enableVertexAttribArray(i);
                        gl.vertexAttribPointer(attr.index, attr.size, attr.type, attr.normalized, attr.stride, attr.offset);
                    } else {
                        gl.disableVertexAttribArray(i);
                        switch (i) {
                            case ARRAY_NORMAL: {
                                gl.vertexAttrib4f(ARRAY_NORMAL, 0.0, 0.0, 1.0, 1.0);
                            } break;
                            case ARRAY_COLOR: {
                                gl.vertexAttrib4f(ARRAY_COLOR, 1.0, 1.0, 1.0, 1.0);
                            } break;
                        }
                    }
                }
            } break;
            case INSTANCE_TYPE_MULTIMESH: {
            } break;
            case INSTANCE_TYPE_IMMEDIATE: {
            } break;
        }
    }

    /**
     * @param {Material_t} p_material
     * @param {boolean} p_alpha_pass
     */
    _setup_material(p_material, p_alpha_pass) {
        const gl = this.gl;

        if (p_material.shader.spatial.uses_screen_texture && this.storage.frame.current_rt) {
            gl.activeTexture(gl.TEXTURE0 + VSG.config.max_texture_image_units - 4);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.copy_screen_effect.gl_color);
        }

        if (p_material.shader.spatial.uses_depth_texture && this.storage.frame.current_rt) {
            gl.activeTexture(gl.TEXTURE0 + VSG.config.max_texture_image_units - 4);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.copy_screen_effect.gl_depth);
        }

        let shader_rebind = true;
        gl.useProgram(p_material.shader.gl_prog);

        if (p_material.shader.spatial.no_depth_test || p_material.shader.spatial.uses_depth_texture) {
            gl.disable(gl.DEPTH_TEST);
        } else {
            gl.enable(gl.DEPTH_TEST);
        }

        let i = 0;
        for (let k in p_material.textures) {
            gl.activeTexture(gl.TEXTURE0 + i);

            let t = p_material.textures[k];
            if (t) {
                this.state.textures[k] = t;
            } else {
                t = this.state.textures[k];
            }

            if (!t) {
                // TODO: use texture based on their texture hints
                gl.bindTexture(gl.TEXTURE_2D, this.storage.resources.white_tex.get_rid().gl_tex);

                continue;
            }

            // TODO: request proxy texture redraw

            if (t.render_target) {
                t.render_target.used_in_frame = true;
            }

            gl.bindTexture(gl.TEXTURE_2D, t.gl_tex);
            if (i === 0) {
                this.state.current_main_tex = t.gl_tex;
            }
        }

        return shader_rebind;
    }

    /**
     * @param {Element_t} p_element
     */
    _render_geometry(p_element) {
        const gl = this.gl;

        switch (p_element.instance.base_type) {
            case INSTANCE_TYPE_MESH: {
                let s = /** @type {Surface_t} */(p_element.geometry);

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
    _post_process(p_env, p_cam_projection) { }
}
