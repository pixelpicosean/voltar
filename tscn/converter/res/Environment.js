module.exports = (data) => {
    return {
        type: 'Environment',

        // background
        bg_mode: data.prop.background_mode,

        bg_energy: data.prop.background_energy,
        bg_color: data.prop.background_color,

        // ambient
        ambient_energy: data.prop.ambient_light_energy,
        ambient_color: data.prop.ambient_light_color,

        // color curve
        adjustment_enabled: data.prop.adjustment_enabled,
        adjustment_brightness: data.prop.adjustment_brightness,
        adjustment_contrast: data.prop.adjustment_contrast,
        adjustment_saturation: data.prop.adjustment_saturation,
        color_correction: data.prop.adjustment_color_correction,

        // fog
        fog_enabled: data.prop.fog_enabled,

        fog_color: data.prop.fog_color,
        fog_sun_color: data.prop.fog_sun_color,
        fog_sun_amount: data.prop.fog_sun_amount,

        fog_depth_enabled: data.prop.fog_depth_enabled,
        fog_depth_begin: data.prop.fog_depth_begin,
        fog_depth_end: data.prop.fog_depth_end,
        fog_depth_curve: data.prop.fog_depth_curve,

        fog_transmit_enabled: data.prop.fog_transmit_enabled,
        fog_transmit_curve: data.prop.fog_transmit_curve,

        fog_height_enabled: data.prop.fog_height_enabled,
        fog_height_min: data.prop.fog_height_min,
        fog_height_max: data.prop.fog_height_max,
        fog_height_curve: data.prop.fog_height_curve,
    };
};

module.exports.is_tres = true;
