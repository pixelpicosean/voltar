const {
    string,
    int,
    real,
    boolean,
    Color,
} = require('../../parser/type_converters');

const Control = require('./Control');

module.exports = (data) => {
    const res = Object.assign({}, Control(data), {
        type: 'Label',
        align: int(data.prop.align),
        autowrap: boolean(data.prop.autowrap),
        clip_text: boolean(data.prop.clip_text),
        lines_skipped: int(data.prop.lines_skipped),
        max_lines_visible: int(data.prop.max_lines_visible),
        percent_visible: real(data.prop.percent_visible),
        text: string(data.prop.text),
        uppercase: boolean(data.prop.uppercase),
        valign: int(data.prop.valign),
        visible_characters: int(data.prop.visible_characters),
        font: undefined,
        custom_colors: undefined,
    });

    if (data.prop['custom_fonts/font']) {
        res.font = data.prop['custom_fonts/font'];
        delete data.prop['custom_fonts/font']
    }
    if (data.prop['custom_colors/font_color']) {
        res.custom_colors = {
            font_color: Color(data.prop['custom_colors/font_color']),
        };
        delete data.prop['custom_colors/font_color']
    }

    return res;
};

module.exports.is_tres = true;
