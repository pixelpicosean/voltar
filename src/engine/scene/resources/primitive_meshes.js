import { res_class_map } from "engine/registry";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Vector3, Vector3Like } from "engine/core/math/vector3";
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
const STRIDE = VERT_LENGTH * 4;

export class PrimitiveMesh extends Mesh {
    get class() { return "PrimitiveMesh" }

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

    _load_data(data) {
        if (data.material) {
            this.set_material(data.material);
        }
        return this;
    }

    get_rid() {
        if (this.pending_request) {
            this._update();
        }
        return this.mesh;
    }

    get_surface_count() {
        if (this.pending_request) {
            this._update();
        }
        return 1;
    }

    free() {
        VSG.storage.mesh_free(this.mesh);
        return super.free();
    }

    /**
     * @param {Material} p_material
     */
    set_material(p_material) {
        this.material = p_material;
        if (!this.pending_request) {
            VSG.storage.mesh_surface_set_material(this.mesh, 0, this.material.material);
        }
    }

    /**
     * @param {number} idx
     * @returns {Material}
     */
    surface_get_material(idx) {
        return this.material;
    }

    /**
     * @param {number} idx
     * @param {Material} p_material
     */
    surface_set_material(idx, p_material) {
        this.set_material(p_material);
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
        VSG.storage.mesh_add_surface_from_data(this.mesh, this.primitive_type, data.attribs, data.vertices, data.indices, pc, data.indices ? data.indices.length : 0, true);
        VSG.storage.mesh_surface_set_material(this.mesh, 0, this.material ? this.material.material : null);

        this.pending_request = false;

        // FIXME: this.clear_cache();
    }

    /**
     * @returns {MeshData}
     */
    _create_mesh_data() { return null }
}

export class QuadMesh extends PrimitiveMesh {
    get class() { return "QuadMesh" }

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
        super._load_data(data);

        if (data.size) this.set_size(data.size);

        return this;
    }

    _create_mesh_data() {
        let w = this.size.x * 0.5,
            h = this.size.y * 0.5;

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

        const vertices = new Float32Array(VERT_LENGTH * 4);
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
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: 0 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: 3 * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: (3 + 3) * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 2, stride: STRIDE, offset: (3 + 3 + 3) * 4 },
            ],
            vertices,
            indices,
        };

        return mesh_data;
    }
}
res_class_map["QuadMesh"] = QuadMesh;

export class PlaneMesh extends PrimitiveMesh {
    get class() { return "PlaneMesh" }

    constructor() {
        super();

        this.size = new Vector2(2, 2);
        this.subdivide_width = 0;
        this.subdivide_depth = 0;
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

    /**
     * @param {number} p_divisions
     */
    set_subdivide_width(p_divisions) {
        this.subdivide_width = p_divisions > 0 ? p_divisions : 0;
        this._request_update();
    }

    /**
     * @param {number} p_divisions
     */
    set_subdivide_depth(p_divisions) {
        this.subdivide_depth = p_divisions > 0 ? p_divisions : 0;
        this._request_update();
    }

    /* virtual methods */

    _load_data(data) {
        super._load_data(data);

        if (data.size) this.set_size(data.size);

        if (data.subdivide_width) this.set_subdivide_width(data.subdivide_width);
        if (data.subdivide_depth) this.set_subdivide_depth(data.subdivide_depth);

        return this;
    }

    _create_mesh_data() {
        const vertices = new Float32Array(VERT_LENGTH * (
            (this.subdivide_depth + 2) * (this.subdivide_width + 2)
        ));
        const indices = new Uint16Array(
            ((this.subdivide_depth + 2) * (this.subdivide_width + 2) - 1) * 2
        );

        let i = 0, j = 0, prevrow = 0, thisrow = 0, point = 0, i_count = 0;
        let x = 0, z = 0;

        let start_pos = this.size.clone().scale(-0.5);

        z = start_pos.y;
        thisrow = point;
        prevrow = 0;
        for (j = 0; j <= this.subdivide_depth + 1; j++) {
            x = start_pos.x;
            for (i = 0; i <= this.subdivide_width + 1; i++) {
                let u = i / (this.subdivide_width + 1);
                let v = j / (this.subdivide_depth + 1);

                vertices[point * VERT_LENGTH + 0] = -x;
                vertices[point * VERT_LENGTH + 1] = 0.0;
                vertices[point * VERT_LENGTH + 2] = -z;

                vertices[point * VERT_LENGTH + 3 + 0] = 0;
                vertices[point * VERT_LENGTH + 3 + 1] = 1;
                vertices[point * VERT_LENGTH + 3 + 2] = 0;

                vertices[point * VERT_LENGTH + 6 + 0] = 1;
                vertices[point * VERT_LENGTH + 6 + 1] = 0;
                vertices[point * VERT_LENGTH + 6 + 2] = 0;

                vertices[point * VERT_LENGTH + 9 + 0] = 1 - u;
                vertices[point * VERT_LENGTH + 9 + 1] = 1 - v;

                point += 1;

                // index
                if (i > 0 && j > 0) {
                    indices[i_count++] = prevrow + i - 1;
                    indices[i_count++] = prevrow + i;
                    indices[i_count++] = thisrow + i - 1;
                    indices[i_count++] = prevrow + i;
                    indices[i_count++] = thisrow + i;
                    indices[i_count++] = thisrow + i - 1;
                }

                x += this.size.x / (this.subdivide_width + 1);
            }

            z += this.size.y / (this.subdivide_depth + 1);
            prevrow = thisrow;
            thisrow = point;
        }

        Vector2.free(start_pos);

        /** @type {MeshData} */
        const mesh_data = {
            attribs: [
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: 0 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: 3 * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: (3 + 3) * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 2, stride: STRIDE, offset: (3 + 3 + 3) * 4 },
            ],
            vertices,
            indices,
        };

        return mesh_data;
    }
}
res_class_map["PlaneMesh"] = PlaneMesh;

export class CubeMesh extends PrimitiveMesh {
    get class() { return "CubeMesh" }

    constructor() {
        super();

        this.size = new Vector3(2, 2, 2);
        this.subdivide_width = 0;
        this.subdivide_height = 0;
        this.subdivide_depth = 0;
    }

    /**
     * @param {Vector3Like} p_size
     */
    set_size(p_size) {
        this.set_size_n(p_size.x, p_size.y, p_size.z);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_size_n(x, y, z) {
        this.size.set(x, y, z);
        this._request_update();
    }

    /**
     * @param {number} p_divisions
     */
    set_subdivide_width(p_divisions) {
        this.subdivide_width = p_divisions > 0 ? p_divisions : 0;
        this._request_update();
    }

    /**
     * @param {number} p_divisions
     */
    set_subdivide_height(p_divisions) {
        this.subdivide_height = p_divisions > 0 ? p_divisions : 0;
        this._request_update();
    }

    /**
     * @param {number} p_divisions
     */
    set_subdivide_depth(p_divisions) {
        this.subdivide_depth = p_divisions > 0 ? p_divisions : 0;
        this._request_update();
    }

    /* virtual methods */

    _load_data(data) {
        super._load_data(data);

        if (data.size) this.set_size(data.size);

        if (data.subdivide_width) this.set_subdivide_width(data.subdivide_width);
        if (data.subdivide_height) this.set_subdivide_height(data.subdivide_height);
        if (data.subdivide_depth) this.set_subdivide_depth(data.subdivide_depth);

        return this;
    }

    _create_mesh_data() {
        const vertices = new Float32Array(VERT_LENGTH * (
            (this.subdivide_width + 2) * (this.subdivide_height + 2) * 2
            +
            (this.subdivide_height + 2) * (this.subdivide_depth + 2) * 2
            +
            (this.subdivide_depth + 2) * (this.subdivide_width + 2) * 2
        ));
        const indices = new Uint16Array(
            ((this.subdivide_width + 2) * (this.subdivide_height + 2) - 1) * 4
            +
            ((this.subdivide_height + 2) * (this.subdivide_depth + 2) - 1) * 4
            +
            ((this.subdivide_depth + 2) * (this.subdivide_width + 2) - 1) * 4
        );

        let i = 0, j = 0, prevrow = 0, thisrow = 0, point = 0, i_count = 0;
        let x = 0, y = 0, z = 0;
        let onethird = 1 / 3;
        let twothirds = 2 / 3;

        let start_pos = this.size.clone().scale(-0.5);

        // front + back
        y = start_pos.y;
        thisrow = point;
        prevrow = 0;
        for (j = 0; j <= this.subdivide_height + 1; j++) {
            x = start_pos.x;
            for (i = 0; i <= this.subdivide_width + 1; i++) {
                let u = i / (3 * (this.subdivide_width + 1));
                let v = j / (2 * (this.subdivide_height + 1));

                // front
                vertices[point * VERT_LENGTH + 0] = x;
                vertices[point * VERT_LENGTH + 1] = -y;
                vertices[point * VERT_LENGTH + 2] = -start_pos.z;

                vertices[point * VERT_LENGTH + 3 + 0] = 0;
                vertices[point * VERT_LENGTH + 3 + 1] = 0;
                vertices[point * VERT_LENGTH + 3 + 2] = 1;

                vertices[point * VERT_LENGTH + 6 + 0] = 1;
                vertices[point * VERT_LENGTH + 6 + 1] = 0;
                vertices[point * VERT_LENGTH + 6 + 2] = 0;

                vertices[point * VERT_LENGTH + 9 + 0] = twothirds + u;
                vertices[point * VERT_LENGTH + 9 + 1] = v;

                point += 1;

                // back
                vertices[point * VERT_LENGTH + 0] = -x;
                vertices[point * VERT_LENGTH + 1] = -y;
                vertices[point * VERT_LENGTH + 2] = start_pos.z;

                vertices[point * VERT_LENGTH + 3 + 0] = 0;
                vertices[point * VERT_LENGTH + 3 + 1] = 0;
                vertices[point * VERT_LENGTH + 3 + 2] = -1;

                vertices[point * VERT_LENGTH + 6 + 0] = -1;
                vertices[point * VERT_LENGTH + 6 + 1] = 0;
                vertices[point * VERT_LENGTH + 6 + 2] = 0;

                vertices[point * VERT_LENGTH + 9 + 0] = twothirds + u;
                vertices[point * VERT_LENGTH + 9 + 1] = v;

                point += 1;

                // index
                if (i > 0 && j > 0) {
                    let i2 = i * 2;

                    // front
                    indices[i_count++] = prevrow + i2 - 2;
                    indices[i_count++] = prevrow + i2;
                    indices[i_count++] = thisrow + i2 - 2;
                    indices[i_count++] = prevrow + i2;
                    indices[i_count++] = thisrow + i2;
                    indices[i_count++] = thisrow + i2 - 2;

                    // back
                    indices[i_count++] = prevrow + i2 - 1;
                    indices[i_count++] = prevrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 - 1;
                    indices[i_count++] = prevrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 - 1;
                }

                x += this.size.x / (this.subdivide_width + 1);
            }

            y += this.size.y / (this.subdivide_height + 1);
            prevrow = thisrow;
            thisrow = point;
        }

        // left + right
        y = start_pos.y;
        thisrow = point;
        prevrow = 0;
        for (j = 0; j <= this.subdivide_height + 1; j++) {
            z = start_pos.z;
            for (i = 0; i <= this.subdivide_depth + 1; i++) {
                let u = i / (3 * (this.subdivide_depth + 1));
                let v = j / (2 * (this.subdivide_height + 1));

                // right
                vertices[point * VERT_LENGTH + 0] = -start_pos.x;
                vertices[point * VERT_LENGTH + 1] = -y;
                vertices[point * VERT_LENGTH + 2] = -z;

                vertices[point * VERT_LENGTH + 3 + 0] = 1;
                vertices[point * VERT_LENGTH + 3 + 1] = 0;
                vertices[point * VERT_LENGTH + 3 + 2] = 0;

                vertices[point * VERT_LENGTH + 6 + 0] = 0;
                vertices[point * VERT_LENGTH + 6 + 1] = 0;
                vertices[point * VERT_LENGTH + 6 + 2] = -1;

                vertices[point * VERT_LENGTH + 9 + 0] = onethird + u;
                vertices[point * VERT_LENGTH + 9 + 1] = v;

                point += 1;

                // left
                vertices[point * VERT_LENGTH + 0] = start_pos.x;
                vertices[point * VERT_LENGTH + 1] = -y;
                vertices[point * VERT_LENGTH + 2] = z;

                vertices[point * VERT_LENGTH + 3 + 0] = -1;
                vertices[point * VERT_LENGTH + 3 + 1] = 0;
                vertices[point * VERT_LENGTH + 3 + 2] = 0;

                vertices[point * VERT_LENGTH + 6 + 0] = 0;
                vertices[point * VERT_LENGTH + 6 + 1] = 0;
                vertices[point * VERT_LENGTH + 6 + 2] = 1;

                vertices[point * VERT_LENGTH + 9 + 0] = u;
                vertices[point * VERT_LENGTH + 9 + 1] = v + 0.5;

                point += 1;

                // index
                if (i > 0 && j > 0) {
                    let i2 = i * 2;

                    // right
                    indices[i_count++] = prevrow + i2 - 2;
                    indices[i_count++] = prevrow + i2;
                    indices[i_count++] = thisrow + i2 - 2;
                    indices[i_count++] = prevrow + i2;
                    indices[i_count++] = thisrow + i2;
                    indices[i_count++] = thisrow + i2 - 2;

                    // left
                    indices[i_count++] = prevrow + i2 - 1;
                    indices[i_count++] = prevrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 - 1;
                    indices[i_count++] = prevrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 - 1;
                }

                z += this.size.z / (this.subdivide_depth + 1);
            }

            y += this.size.y / (this.subdivide_height + 1);
            prevrow = thisrow;
            thisrow = point;
        }

        // top + bottom
        z = start_pos.z;
        thisrow = point;
        prevrow = 0;
        for (j = 0; j <= this.subdivide_depth + 1; j++) {
            x = start_pos.x;
            for (i = 0; i <= this.subdivide_width + 1; i++) {
                let u = i / (3 * (this.subdivide_width + 1));
                let v = j / (2 * (this.subdivide_depth + 1));

                // top
                vertices[point * VERT_LENGTH + 0] = -x;
                vertices[point * VERT_LENGTH + 1] = -start_pos.y;
                vertices[point * VERT_LENGTH + 2] = -z;

                vertices[point * VERT_LENGTH + 3 + 0] = 0;
                vertices[point * VERT_LENGTH + 3 + 1] = 1;
                vertices[point * VERT_LENGTH + 3 + 2] = 0;

                vertices[point * VERT_LENGTH + 6 + 0] = -1;
                vertices[point * VERT_LENGTH + 6 + 1] = 0;
                vertices[point * VERT_LENGTH + 6 + 2] = 0;

                vertices[point * VERT_LENGTH + 9 + 0] = onethird + u;
                vertices[point * VERT_LENGTH + 9 + 1] = 0.5 + v;

                point += 1;

                // bottom
                vertices[point * VERT_LENGTH + 0] = x;
                vertices[point * VERT_LENGTH + 1] = start_pos.y;
                vertices[point * VERT_LENGTH + 2] = -z;

                vertices[point * VERT_LENGTH + 3 + 0] = 0;
                vertices[point * VERT_LENGTH + 3 + 1] = -1;
                vertices[point * VERT_LENGTH + 3 + 2] = 0;

                vertices[point * VERT_LENGTH + 6 + 0] = 1;
                vertices[point * VERT_LENGTH + 6 + 1] = 0;
                vertices[point * VERT_LENGTH + 6 + 2] = 0;

                vertices[point * VERT_LENGTH + 9 + 0] = twothirds + u;
                vertices[point * VERT_LENGTH + 9 + 1] = 0.5 + v;

                point += 1;

                // index
                if (i > 0 && j > 0) {
                    let i2 = i * 2;

                    // top
                    indices[i_count++] = prevrow + i2 - 2;
                    indices[i_count++] = prevrow + i2;
                    indices[i_count++] = thisrow + i2 - 2;
                    indices[i_count++] = prevrow + i2;
                    indices[i_count++] = thisrow + i2;
                    indices[i_count++] = thisrow + i2 - 2;

                    // bottom
                    indices[i_count++] = prevrow + i2 - 1;
                    indices[i_count++] = prevrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 - 1;
                    indices[i_count++] = prevrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 + 1;
                    indices[i_count++] = thisrow + i2 - 1;
                }

                x += this.size.x / (this.subdivide_width + 1);
            }

            z += this.size.z / (this.subdivide_depth + 1);
            prevrow = thisrow;
            thisrow = point;
        }

        /** @type {MeshData} */
        const mesh_data = {
            attribs: [
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: 0 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: 3 * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 3, stride: STRIDE, offset: (3 + 3) * 4 },
                { type: WebGLRenderingContext.FLOAT, size: 2, stride: STRIDE, offset: (3 + 3 + 3) * 4 },
            ],
            vertices,
            indices,
        };

        Vector3.free(start_pos);

        return mesh_data;
    }
}
res_class_map["CubeMesh"] = CubeMesh;
