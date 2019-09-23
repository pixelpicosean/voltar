const {
    real,
} = require('../../parser/type_converters');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'MarginContainer',
        margin_bottom: real(data.prop['custom_constants/margin_bottom']),
        margin_left: real(data.prop['custom_constants/margin_left']),
        margin_right: real(data.prop['custom_constants/margin_right']),
        margin_top: real(data.prop['custom_constants/margin_top']),
    });

    return res;
};

module.exports.is_tres = () => true;
