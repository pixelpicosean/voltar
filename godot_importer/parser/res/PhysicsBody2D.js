const _ = require('lodash');
const {
    boolean,
    Vector2,
} = require('../parse_utils');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'Sprite',
        texture: data.prop.texture,
        pivot: Vector2(data.prop.offset),
    });

    // Set anchor based on `center`
    const centered = boolean(data.prop.centered);
    if (centered === undefined || (centered !== undefined && centered)) {
        res.anchor = { x: 0.5, y: 0.5 };
    }

    // Revert pivot
    if (res.pivot) {
        res.pivot.x = -res.pivot.x;
        res.pivot.y = -res.pivot.y;
    }

    return res;
};
