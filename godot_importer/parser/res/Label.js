const _ = require('lodash');
const {
    string,
    path,
    int,
    real,
    boolean,
    Vector2,
    Color,
} = require('../parse_utils');

const deg_to_rad = (deg) => _.isNumber(deg) ? (deg / 180 * Math.PI) : undefined;
const color_to_hex = (color) => '#' + ((((color.r * 255) << 16) + ((color.g * 255) << 8) + (color.b * 255 | 0))).toString(16);

module.exports = (data) => {
    const style = {};

    const align_num = int(data.prop.align);
    if (align_num !== undefined) {
        let align = undefined;
        switch (align_num) {
            case 1: {
                align = 'center';
            } break;
            case 2: {
                align = 'right';
            } break;
        }
        style.align = align;
    }

    style.wordWrap = boolean(data.prop.autowrap || false);

    const fill_color = Color(data.prop['custom_colors/font_color']);
    if (fill_color) {
        style.fill = color_to_hex(fill_color);
    }

    const shadow_color = Color(data.prop['custom_colors/font_color_shadow']);
    if (shadow_color) {
        const as_outline = int(data.prop['custom_constants/shadow_as_outline']);
        if (_.isNumber(as_outline) && as_outline > 0) {
            style.stroke = color_to_hex(shadow_color);
            style.strokeThickness = int(data.prop['custom_constants/shadow_offset_x']) * 2;
        } else {
            style.dropShadow = true;
            style.dropShadowColor = color_to_hex(shadow_color);
            let offset_x = int(data.prop['custom_constants/shadow_offset_x']);
            let offset_y = int(data.prop['custom_constants/shadow_offset_y']);
            style.dropShadowAngle = Math.atan2(offset_y, offset_x);
            style.dropShadowDistance = Math.round(Math.sqrt(offset_x * offset_x + offset_y * offset_y));
        }
    }

    data.prop.margin_left = data.prop.margin_left ? data.prop.margin_left : '0';
    data.prop.margin_top = data.prop.margin_top ? data.prop.margin_top : '0';

    const res = {
        key: data.key,
        type: 'Text',
        index: int(data.attr.index),
        name: string(data.attr.name),
        parent: path(data.attr.parent),
        position: {
            x: real(data.prop.margin_left),
            y: real(data.prop.margin_top),
        },
        rotation: deg_to_rad(real(data.prop.rect_rotation)),
        text: string(data.prop.text),
        font: data.prop['custom_fonts/font'],
        style: style,
    };

    if (res.style.wordWrap) {
        res.style.wordWrapWidth = real(data.prop.margin_right) - real(data.prop.margin_left);
    }

    return res;
};
