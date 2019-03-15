const {
    int,
} = require('../parse_utils');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'VBoxContainer',
    });

    res.alignment = int(data.prop.alignment);
    res.separation = int(data.prop['custom_constants/separation']);

    return res;
};
