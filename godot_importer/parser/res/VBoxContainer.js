const {
    int,
} = require('../type_converters');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'VBoxContainer',
        alignment: int(data.prop.alignment),
        separation: int(data.prop['custom_constants/separation']),
    });

    return res;
};
