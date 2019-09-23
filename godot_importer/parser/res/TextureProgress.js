const {
    int,
    real,
    boolean,
    Vector2,
    Color,
    Nullable,
} = require('../type_converters');

const Range = require('./Range');

module.exports = (data) => {
    const res = Object.assign({}, Range(data), {
        type: 'TextureProgress',

        texture_under: Nullable(data.prop.texture_under),
        texture_progress: Nullable(data.prop.texture_progress),
        texture_over: Nullable(data.prop.texture_over),

        fill_mode: int(data.prop.fill_mode),

        nine_patch_stretch: boolean(data.prop.nine_patch_stretch),

        radial_center_offset: Vector2(data.prop.radial_center_offset),
        radial_fill_degrees: real(data.prop.radial_fill_degrees),
        radial_initial_angle: real(data.prop.radial_initial_angle),

        stretch_margin_bottom: int(data.prop.stretch_margin_bottom),
        stretch_margin_left: int(data.prop.stretch_margin_left),
        stretch_margin_top: int(data.prop.stretch_margin_top),
        stretch_margin_right: int(data.prop.stretch_margin_right),

        tint_under: Color(data.prop.tint_under),
        tint_progress: Color(data.prop.tint_progress),
        tint_over: Color(data.prop.tint_over),
    });

    return res;
};
