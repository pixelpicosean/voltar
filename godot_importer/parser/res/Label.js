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
const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'Label',
    });

    res.align = int(data.prop.align);
    res.autowrap = boolean(data.prop.autowrap);
    res.clip_text = boolean(data.prop.clip_text);
    res.lines_skipped = int(data.prop.lines_skipped);
    res.max_lines_visible = int(data.prop.max_lines_visible);
    res.percent_visible = real(data.prop.percent_visible);
    res.text = string(data.prop.text);
    res.uppercase = boolean(data.prop.uppercase);
    res.valign = int(data.prop.valign);
    res.visible_characters = int(data.prop.visible_characters);

    if (data.prop['custom_fonts/font']) {
        res.font = data.prop['custom_fonts/font'];
    }
    if (data.prop['custom_colors/font_color']) {
        res.custom_colors = {
            font_color: Color(data.prop['custom_colors/font_color']),
        };
    }

    return res;
};
