const {
    int,
    real,
    boolean,
    Vector2,
} = require('../parse_utils');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'Control',
    });

    res.anchor_bottom = real(data.prop.anchor_bottom);
    res.anchor_left = real(data.prop.anchor_left);
    res.anchor_top = real(data.prop.anchor_top);
    res.anchor_right = real(data.prop.anchor_right);

    res.margin_bottom = real(data.prop.margin_bottom);
    res.margin_left = real(data.prop.margin_left);
    res.margin_top = real(data.prop.margin_top);
    res.margin_right = real(data.prop.margin_right);

    res.grow_horizontal = int(data.prop.grow_horizontal);
    res.grow_vertical = int(data.prop.grow_vertical);

    res.rect_min_size = Vector2(data.prop.rect_min_size);
    res.rect_rotation = real(data.prop.rect_rotation);
    res.rect_scale = Vector2(data.prop.rect_scale);
    res.rect_pivot_offset = Vector2(data.prop.rect_pivot_offset);
    res.rect_clip_content = boolean(data.prop.rect_clip_content);

    res.mouse_default_cursor_shape = int(data.prop.mouse_default_cursor_shape);

    res.size_flags_horizontal = int(data.prop.size_flags_horizontal);
    res.size_flags_vertical = int(data.prop.size_flags_vertical);
    res.size_flags_stretch_ratio = real(data.prop.size_flags_stretch_ratio);

    return res;
};
