module.exports = (data) => {
    return {
        id: data.attr.id,
        type: 'ProceduralSky',

        radiance_size: data.prop.radiance_size,
        sky_top_color: data.prop.sky_top_color,
        sky_horizon_color: data.prop.sky_horizon_color,
        sky_curve: data.prop.sky_curve,
        ground_bottom_color: data.prop.ground_bottom_color,
        ground_horizon_color: data.prop.ground_horizon_color,
        ground_curve: data.prop.ground_curve,
        sun_angle_min: data.prop.sun_angle_min,
        sun_angle_max: data.prop.sun_angle_max,
        texture_size: data.prop.texture_size,
    };
};

module.exports.is_tres = true;
