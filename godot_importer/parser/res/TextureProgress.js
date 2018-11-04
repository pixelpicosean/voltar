const {
    int,
    real,
    boolean,
    Vector2,
    Color,
    Nullable,
} = require('../parse_utils');

const Range = require('./Range');

module.exports = (data) => {
    const res = Object.assign({}, Range(data), {
        type: 'TextureProgress',
    });

    res.texture_under = Nullable(data.prop.texture_under);
    res.texture_progress = Nullable(data.prop.texture_progress);
    res.texture_over = Nullable(data.prop.texture_over);

    res.fill_mode = int(data.prop.fill_mode);

    res.nine_patch_stretch = boolean(data.prop.nine_patch_stretch);

    res.radial_center_offset = Vector2(data.prop.radial_center_offset);
    res.radial_fill_degrees = real(data.prop.radial_fill_degrees);
    res.radial_initial_angle = real(data.prop.radial_initial_angle);

    res.stretch_margin_bottom = int(data.prop.stretch_margin_bottom);
    res.stretch_margin_left = int(data.prop.stretch_margin_left);
    res.stretch_margin_top = int(data.prop.stretch_margin_top);
    res.stretch_margin_right = int(data.prop.stretch_margin_right);

    res.tint_under = Color(data.prop.tint_under);
    res.tint_progress = Color(data.prop.tint_progress);
    res.tint_over = Color(data.prop.tint_over);

    return res;
};
