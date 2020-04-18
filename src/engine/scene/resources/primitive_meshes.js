import { res_class_map } from "engine/registry";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
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

export class PrimitiveMesh extends Mesh {
    constructor() {
        super();

        /** @type {import('engine/drivers/webgl/rasterizer_storage').Mesh_t} */
        this.mesh = null;

        this.aabb = new AABB;
        this.custom_aabb = new AABB;

        /** @type {Material} */
        this.material = null;
        this.flip_faces = false;

        this.pending_request = false;

        this.primitive_type = 0;
    }

    _request_update() {
        if (this.pending_request) return;
        this._update();
    }

    _update() {
        const data = this._create_mesh_data();

        // TODO: update aabb

        // TODO: flip faces
        if (this.flip_faces) { }

        VSG.storage.mesh_clear(this.mesh);
        VSG.storage.mesh_add_surface_from_data(this.mesh, this.primitive_type, data.attribs, data.vertices, data.indices);
        VSG.storage.mesh_surface_set_material(this.mesh, 0, this.material.materials.spatial);
    }

    /**
     * @returns {MeshData}
     */
    _create_mesh_data() { return null }
}

export class QuadMesh extends PrimitiveMesh {
    constructor() {
        super();

        this.size = new Vector2;
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
        let w = this.size.x,
            h = this.size.y;

        /**
         * face     x3
         * normal   x3
         * tangent  x4
         * uv       x2
         */
        let stride = (3 + 3 + 4 + 2) * 4;

        const faces = [
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

        const vertices = new Float32Array((3 + 3 + 4 + 2) * 6);
        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3,
        ])

        for (let i = 0; i < 6; i++) {
            let j = indices[i];

            // face
            vertices[i+0] = faces[j+0];
            vertices[i+1] = faces[j+1];
            vertices[i+2] = faces[j+2];

            // normal
            vertices[i+3+0] = 0;
            vertices[i+3+1] = 0;
            vertices[i+3+2] = 1;

            // tangent
            vertices[i+6+0] = 1;
            vertices[i+6+1] = 0;
            vertices[i+6+2] = 0;
            vertices[i+6+3] = 1;

            // uv
            vertices[i+10+0] = uvs[j+0];
            vertices[i+10+1] = uvs[j+1];
        }

        /** @type {MeshData} */
        const mesh_data = {
            attribs: [
                { type: WebGLRenderingContext.FLOAT, size: 3, stride, offset: 0 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride, offset: 3 * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 4, stride, offset: (3 + 3) * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 2, stride, offset: (3 + 3 + 4) * 4 },
            ],
            vertices,
            indices,
        };

        return mesh_data;
    }
}
res_class_map["QuadMesh"] = QuadMesh;
