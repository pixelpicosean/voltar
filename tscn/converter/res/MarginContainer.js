const {
    real,
} = require('../../parser/type_converters');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'MarginContainer',
        'custom_constants/margin_bottom': real(data.prop['custom_constants/margin_bottom']),
        'custom_constants/margin_left': real(data.prop['custom_constants/margin_left']),
        'custom_constants/margin_right': real(data.prop['custom_constants/margin_right']),
        'custom_constants/margin_top': real(data.prop['custom_constants/margin_top']),
    });

    return res;
};

module.exports.is_tres = true;
