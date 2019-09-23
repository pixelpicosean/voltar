const {
    int,
    real,
    boolean,
    Vector2,
} = require('../../parser/type_converters');

const CanvasItem = require('./CanvasItem');

module.exports = (data) => {
    const res = Object.assign({}, CanvasItem(data), {
        type: 'Control',

        anchor_bottom: real(data.prop.anchor_bottom),
        anchor_left: real(data.prop.anchor_left),
        anchor_top: real(data.prop.anchor_top),
        anchor_right: real(data.prop.anchor_right),

        margin_bottom: real(data.prop.margin_bottom),
        margin_left: real(data.prop.margin_left),
        margin_top: real(data.prop.margin_top),
        margin_right: real(data.prop.margin_right),

        grow_horizontal: int(data.prop.grow_horizontal),
        grow_vertical: int(data.prop.grow_vertical),

        rect_min_size: Vector2(data.prop.rect_min_size),
        rect_rotation: real(data.prop.rect_rotation),
        rect_scale: Vector2(data.prop.rect_scale),
        rect_pivot_offset: Vector2(data.prop.rect_pivot_offset),
        rect_clip_content: boolean(data.prop.rect_clip_content),

        mouse_default_cursor_shape: int(data.prop.mouse_default_cursor_shape),

        size_flags_horizontal: int(data.prop.size_flags_horizontal),
        size_flags_vertical: int(data.prop.size_flags_vertical),
        size_flags_stretch_ratio: real(data.prop.size_flags_stretch_ratio),
    });

    return res;
};

module.exports.is_tres = () => true;
