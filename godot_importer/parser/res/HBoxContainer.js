const {
    int,
    real,
} = require('../type_converters');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'HBoxContainer',
        alignment: int(data.prop.alignment),
        separation: real(data.prop['custom_constants/separation']),
    });

    return res;
};
