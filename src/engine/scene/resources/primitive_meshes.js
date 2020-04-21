import { res_class_map } from "engine/registry";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3";
import { AABB } from "engine/core/math/aabb";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { Material } from "./material";
import { Mesh } from "./mesh";

/**
 * @typedef MeshData
 * @property {import('engine/drivers/webgl/rasterizer_storage').VertAttribDef[]} attribs
 * @property {Float32Array} vertices
 * @property {Uint16Array} [indices]
 */

/**
 * All vertices in a single Float32Array:
 * - position x3
 * - normal   x3
 * - tangent  x3
 * - uv       x2
 */
const VERT_LENGTH = 3 + 3 + 3 + 2;

export class PrimitiveMesh extends Mesh {
    constructor() {
        super();

        /** @type {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} */
        this.mesh = VSG.storage.mesh_create();

        this.aabb = new AABB;
        this.custom_aabb = new AABB;

        /** @type {Material} */
        this.material = null;
        this.flip_faces = false;

        this.pending_request = true;

        this.primitive_type = WebGLRenderingContext.TRIANGLES;
    }

    get_surface_count() {
        if (this.pending_request) {
            this._update();
        }
        return 1;
    }

    free() {
        VSG.storage.free_rid(this.mesh);
        return super.free();
    }

    _request_update() {
        if (this.pending_request) return;
        this._update();
    }

    _update() {
        const data = this._create_mesh_data();

        this.aabb.set(0, 0, 0, 0, 0, 0);

        let v = data.vertices;
        let pc = Math.floor(v.length / VERT_LENGTH);
        let vec = Vector3.new();
        for (let i = 0; i < pc; i++) {
            if (i === 0) {
                this.aabb.position.set(v[0], v[1], v[2]);
            } else {
                this.aabb.expand_to(vec.set(
                    v[i * VERT_LENGTH + 0],
                    v[i * VERT_LENGTH + 1],
                    v[i * VERT_LENGTH + 2]
                ));
            }
        }
        Vector3.free(vec);

        // TODO: flip faces
        if (this.flip_faces) { }

        VSG.storage.mesh_clear(this.mesh);
        VSG.storage.mesh_add_surface_from_data(this.mesh, this.primitive_type, data.attribs, data.vertices, data.indices, true);
        VSG.storage.mesh_surface_set_material(this.mesh, 0, this.material ? this.material.materials.spatial : null);

        this.pending_request = false;

        this.clear_cache();
    }

    /**
     * @returns {MeshData}
     */
    _create_mesh_data() { return null }
}

export class QuadMesh extends PrimitiveMesh {
    constructor() {
        super();

        this.size = new Vector2(1, 1);
    }

    /**
     * @param {Vector2Like} p_size
     */
    set_size(p_size) {
        this.set_size_n(p_size.x, p_size.y);
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    set_size_n(x, y) {
        this.size.set(x, y);
        this._request_update();
    }

    /* virtual methods */

    _load_data(data) {
        if (data.size) this.set_size(data.size);

        return this;
    }

    _create_mesh_data() {
        let w = this.size.x * 0.5,
            h = this.size.y * 0.5;

        let stride = VERT_LENGTH * 4;

        const positions = [
            -w, -h, 0.0,
            -w,  h, 0.0,
             w,  h, 0.0,
             w, -h, 0.0,
        ]
        const uvs = [
            0, 1,
            0, 0,
            1, 0,
            1, 1,
        ]

        const vertices = new Float32Array(VERT_LENGTH * 6);
        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3,
        ])

        for (let i = 0; i < 4; i++) {
            let j = i * VERT_LENGTH;

            // faces
            vertices[j + 0] = positions[i * 3 + 0];
            vertices[j + 1] = positions[i * 3 + 1];
            vertices[j + 2] = positions[i * 3 + 2];

            // normal
            vertices[j + 3 + 0] = 0;
            vertices[j + 3 + 1] = 0;
            vertices[j + 3 + 2] = 1;

            // tangent
            vertices[j + 6 + 0] = 1;
            vertices[j + 6 + 1] = 0;
            vertices[j + 6 + 2] = 0;

            // uv
            vertices[j + 9 + 0] = uvs[i * 2 + 0];
            vertices[j + 9 + 1] = uvs[i * 2 + 1];
        }

        /** @type {MeshData} */
        const mesh_data = {
            attribs: [
                { type: WebGLRenderingContext.FLOAT, size: 3, stride, offset: 0 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride, offset: 3 * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride, offset: (3 + 3) * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 2, stride, offset: (3 + 3 + 3) * 4 },
            ],
            vertices,
            indices,
        };

        return mesh_data;
    }
}
res_class_map["QuadMesh"] = QuadMesh;
