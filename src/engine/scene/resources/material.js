import { res_class_map } from "engine/registry";

export class Material {
    get class() { return "Material" }

    constructor() {
        /** @type {import('engine/drivers/webgl/rasterizer_storage').Material_t} */
        this.material = null;
    }
}


export class ShaderMaterial extends Material {
    get class() { return "ShaderMaterial" }
}
res_class_map['ShaderMaterial'] = ShaderMaterial
