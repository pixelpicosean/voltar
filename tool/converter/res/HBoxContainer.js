const {
    int,
    real,
} = require('../../parser/type_converters');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'HBoxContainer',
        alignment: int(data.prop.alignment),
        'custom_constants/separation': real(data.prop['custom_constants/separation']),
    });

    return res;
};

module.exports.is_tres = true;
