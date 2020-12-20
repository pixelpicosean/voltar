const VisualInstance = require("./VisualInstance");

module.exports = (data) => {
    const res = Object.assign({}, VisualInstance(data), {
        cast_shadow: data.prop.cast_shadow,

        extra_cull_margin: data.prop.extra_cull_margin,

        lod_min_distance: data.prop.lod_min_distance,
        lod_max_distance: data.prop.lod_max_distance,
        lod_min_hysteresis: data.prop.lod_min_hysteresis,
        lod_max_hysteresis: data.prop.lod_max_hysteresis,

        use_in_baked_light: data.prop.use_in_baked_light,

        material_override: data.prop.material_override,
    });
    return res;
};

module.exports.is_tres = true;
