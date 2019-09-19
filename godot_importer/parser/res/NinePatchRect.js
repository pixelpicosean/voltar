const {
    int,
    real,
    boolean,
} = require('../parse_utils');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'NinePatchRect',
        texture: data.prop.texture,
        draw_center: boolean(data.prop.draw_center),
        axis_stretch_horizontal: int(data.prop.axis_stretch_horizontal),
        axis_stretch_vertical: int(data.prop.axis_stretch_vertical),
        patch_margin_bottom: real(data.prop.patch_margin_bottom),
        patch_margin_left: real(data.prop.patch_margin_left),
        patch_margin_top: real(data.prop.patch_margin_top),
        patch_margin_right: real(data.prop.patch_margin_right),
    });

    return res;
};
