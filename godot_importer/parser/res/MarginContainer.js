const {
    int,
    real,
    boolean,
    Vector2,
} = require('../parse_utils');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'MarginContainer',
    });

    res.margin_bottom = int(data.prop['custom_constants/margin_bottom']);
    res.margin_left = int(data.prop['custom_constants/margin_left']);
    res.margin_right = int(data.prop['custom_constants/margin_right']);
    res.margin_top = int(data.prop['custom_constants/margin_top']);

    return res;
};
