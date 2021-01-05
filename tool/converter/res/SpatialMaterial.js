module.exports = (data) => {
    let res = {
        id: data.attr.id,
        type: data.attr.type,

        diffuse: data.prop.params_diffuse_mode,
        specular: data.prop.params_specular_mode,

        spatial: {
            blend_mode: data.prop.params_blend_mode,
            depth_draw_mode: data.prop.params_depth_draw_mode,
            cull_mode: data.prop.params_cull_mode,
        },
        conditions: [],

        albedo_color: data.prop.albedo_color,
        albedo_texture: data.prop.albedo_texture,

        roughness: data.prop.roughness,
        metallic: data.prop.metallic,
        metallic_specular: data.prop.metallic_specular,

        emission_enabled: data.prop.emission_enabled,
        emission: data.prop.emission,
        emission_energy: data.prop.emission_energy,
        emission_operator: data.prop.emission_operator,

        rim_enabled: data.prop.rim_enabled,
        rim: data.prop.rim,
        rim_tint: data.prop.rim_tint,
    };

    if (data.prop["flags_transparent"]) {
        res.spatial.uses_alpha = true;
    }
    if (data.prop["flags_use_shadow_to_opacity"]) {
        res.conditions.push("USE_SHADOW_TO_OPACITY");
    }
    if (data.prop["flags_unshaded"]) {
        res.spatial.unshaded = true;
    }
    if (data.prop["params_use_alpha_scissor"]) {
        res.spatial.uses_alpha_scissor = true;
        res.conditions.push("ALPHA_SCISSOR_USED");
    }

    return res;
};

module.exports.is_tres = true;
