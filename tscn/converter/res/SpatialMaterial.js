module.exports = (data) => {
    return {
        id: data.attr.id,
        type: "SpatialMaterial",

        albedo_color: data.prop.albedo_color,
        albedo_texture: data.prop.albedo_texture,
        metallic: data.prop.metallic,
        metallic_specular: data.prop.metallic_specular,
        roughness: data.prop.roughness,
    };
};

module.exports.is_tres = true;
