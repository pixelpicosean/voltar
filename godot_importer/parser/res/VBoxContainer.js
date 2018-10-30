const {
    int,
    real,
    boolean,
    Vector2,
} = require('../parse_utils');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'VBoxContainer',
    });

    res.alignment = int(data.prop.alignment);

    return res;
};
