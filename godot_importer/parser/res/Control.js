const {
    real,
    boolean,
    Vector2,
} = require('../parse_utils');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'Control',
    });

    res.anchor_bottom = real(data.prop.anchor_bottom);
    res.anchor_left = real(data.prop.anchor_left);
    res.anchor_top = real(data.prop.anchor_top);
    res.anchor_right = real(data.prop.anchor_right);

    res.margin_bottom = real(data.prop.margin_bottom);
    res.margin_left = real(data.prop.margin_left);
    res.margin_top = real(data.prop.margin_top);
    res.margin_right = real(data.prop.margin_right);

    return res;
};
