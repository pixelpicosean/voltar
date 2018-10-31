const {
    int,
    boolean,
} = require('../parse_utils');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'NinePatchRect',
    });

    res.texture = data.prop.texture;

    res.draw_center = boolean(data.prop.draw_center);

    res.axis_stretch_horizontal = int(data.prop.axis_stretch_horizontal);
    res.axis_stretch_vertical = int(data.prop.axis_stretch_vertical);

    res.patch_margin_bottom = int(data.prop.patch_margin_bottom);
    res.patch_margin_left = int(data.prop.patch_margin_left);
    res.patch_margin_top = int(data.prop.patch_margin_top);
    res.patch_margin_right = int(data.prop.patch_margin_right);

    return res;
};
