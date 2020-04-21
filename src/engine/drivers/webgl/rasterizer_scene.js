import { Vector2 } from 'engine/core/math/vector2';
import { Transform } from 'engine/core/math/transform';
import { CameraMatrix } from 'engine/core/math/camera_matrix';
import { Color } from 'engine/core/color';
import {
    ShaderMaterial,
    SPATIAL_SHADER_UNIFORMS,
} from 'engine/scene/resources/material';

import {
    INSTANCE_TYPE_MESH,
    INSTANCE_TYPE_MULTIMESH,
    INSTANCE_TYPE_IMMEDIATE,
} from 'engine/servers/visual_server';
import {
    Instance_t,
} from 'engine/servers/visual/visual_server_scene';
import { VSG } from 'engine/servers/visual/visual_server_globals';

import {
    Mesh_t,
    Surface_t,
    Geometry_t,
    Material_t,
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

export class Environment_t {
    constructor() {
        this.bg_mode = ENV_BG_CLEAR_COLOR;

        this.bg_energy = [1.0];
        this.bg_color = [0, 0, 0, 1];
        this.ambient_energy = [1.0];
        this.ambient_color = [0, 0, 0, 1];
    }
}

/**
 * @param {Element_t} a
 * @param {Element_t} b
 */
const sort_by_key = (a, b) => {
    if (a.depth_layer + a.priority === b.depth_layer + b.priority) {
        return (a.geometry_index + a.material_index)
            -
            (b.geometry_index + b.material_index)
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
    constructor() {
        /** @type {Instance_t} */
        this.instance = null;

        /** @type {Geometry_t} */
        this.geometry = null;

        /** @type {Material_t} */
        this.material = null;

        this.front_facing = true;

        this.depth_layer = 0;
        this.priority = 0;
        this.geometry_index = 0;
        this.material_index = 0;
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

        this.state = {
            used_screen_texture: false,
            viewport_size: new Vector2,
            screen_pixel_size: new Vector2,

            default_ambient: new Color,
            default_bg: new Color,

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
                WORLD_TRANSFORM: [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1,
                ],
                TIME: [0],
                VIEWPORT_SIZE: [0, 0],
                SCREEN_PIXEL_SIZE: [0, 0],
            },
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
                    COLOR = vec4(0.0, 1.0, 0.5, 1.0);
                }
            `);
            this.materials.spatial = this.init_shader_material(mat, normal_vs, normal_fs, SPATIAL_SHADER_UNIFORMS, true);
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
     * @param {Transform} p_cam_transform
     * @param {CameraMatrix} p_cam_projection
     * @param {boolean} p_cam_ortho
     * @param {Instance_t[]} p_cull_result
     * @param {number} p_cull_count
     * @param {Environment_t} p_env
     */
    render_scene(p_cam_transform, p_cam_projection, p_cam_ortho, p_cull_result, p_cull_count, p_env) {
        let cam_transform = p_cam_transform.clone();

        let viewport_width = 0, viewport_height = 0;
        let viewport_x = 0, viewport_y = 0;

        let current_fb = this.storage.frame.current_rt.gl_fbo;

        viewport_width = this.storage.frame.current_rt.width;
        viewport_height = this.storage.frame.current_rt.height;
        viewport_x = this.storage.frame.current_rt.x;
        viewport_y = this.storage.frame.current_rt.y;

        this.state.used_screen_texture = false;
        this.state.viewport_size.set(viewport_width, viewport_height);
        this.state.screen_pixel_size.set(1.0 / viewport_width, 1.0 / viewport_height);

        if (p_env && p_env.bg_mode === ENV_BG_CANVAS) {
            // TODO: copy 2d to screen copy texture
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

        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // clear color

        let clear_color = Color.new(0, 0, 0, 1);

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

        this.state.default_ambient.copy(clear_color);
        this.state.default_bg.copy(clear_color);

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
                    // TODO: use screen copy as background
                } break;
            }
        }

        // opaque pass first
        this.render_list.sort_by_key(false);
        this._render_render_list(this.render_list.elements, this.render_list.element_count, cam_transform, p_cam_projection, p_env, false);

        if (this.storage.frame.current_rt && this.state.used_screen_texture) {
            // TODO: copy screen texture
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

            // TODO: direction lights
            if (p_material.shader.spatial.unshaded) {
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

        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);

        if (p_alpha_pass) {
            gl.enable(gl.BLEND);
        } else {
            gl.disable(gl.BLEND);
        }

        let prev_material = null;
        let prev_geometry = null;

        for (let i = 0; i < p_element_count; i++) {
            let e = p_elements[i];

            let material = e.material;
            let global_uniforms = this.state.uniforms;

            let rebind = false;

            if (e.geometry !== prev_geometry) {
                this._setup_geometry(e);
            }

            let shader_rebind = false;
            if (rebind || material !== prev_material) {
                shader_rebind = this._setup_material(material, p_alpha_pass);
            }

            // TODO: this._set_cull()

            if (i === 0 || shader_rebind) {
                if (p_env) {
                    global_uniforms.bg_energy = p_env.bg_energy;
                    global_uniforms.bg_color = p_env.bg_color;
                    global_uniforms.ambient_color = p_env.ambient_color;
                    global_uniforms.ambient_energy = p_env.ambient_energy;
                } else {
                    global_uniforms.bg_energy = [1.0];
                    global_uniforms.bg_color = this.state.default_bg.as_array();
                    global_uniforms.ambient_color = this.state.default_ambient.as_array();
                    global_uniforms.ambient_energy = [1.0];
                }

                // TODO: fog

                global_uniforms.CAMERA_MATRIX = p_view_transform.as_array(global_uniforms.CAMERA_MATRIX);
                global_uniforms.INV_CAMERA_MATRIX = p_view_transform.as_array(global_uniforms.INV_CAMERA_MATRIX);
                global_uniforms.PROJECTION_MATRIX = view_transform_inverse.as_array(global_uniforms.PROJECTION_MATRIX);
                global_uniforms.INV_PROJECTION_MATRIX = projection_inverse.as_array(global_uniforms.INV_PROJECTION_MATRIX);
                global_uniforms.TIME[0] = this.storage.frame.time[0];
                global_uniforms.VIEWPORT_SIZE[0] = this.state.viewport_size.x;
                global_uniforms.VIEWPORT_SIZE[1] = this.state.viewport_size.y;
                global_uniforms.SCREEN_PIXEL_SIZE[0] = this.state.screen_pixel_size.x;
                global_uniforms.SCREEN_PIXEL_SIZE[1] = this.state.screen_pixel_size.y;
            }

            global_uniforms.WORLD_TRANSFORM = e.instance.transform.as_array(global_uniforms.WORLD_TRANSFORM);

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
            gl.activeTexture(gl.TEXTURE0 + this.storage.config.max_texture_image_units - 4);
            gl.bindTexture(gl.TEXTURE_2D, this.storage.frame.current_rt.copy_screen_effect.gl_color);
        }

        if (p_material.shader.spatial.uses_depth_texture && this.storage.frame.current_rt) {
            gl.activeTexture(gl.TEXTURE0 + this.storage.config.max_texture_image_units - 4);
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

            if (!t) {
                // TODO: use texture based on their texture hints
                gl.bindTexture(gl.TEXTURE_2D, this.storage.resources.white_tex);

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
