module.exports = (data) => {
    return {
        id: data.attr.id,
        type: data.attr.type,

        albedo_color: data.prop.albedo_color,
        albedo_texture: data.prop.albedo_texture,

        metallic: data.prop.metallic,
        metallic_specular: data.prop.metallic_specular,

        roughness: data.prop.roughness,

        emission_enabled: data.prop.emission_enabled,
        emission: data.prop.emission,
        emission_energy: data.prop.emission_energy,
        emission_operator: data.prop.emission_operator,
    };
};

module.exports.is_tres = true;
