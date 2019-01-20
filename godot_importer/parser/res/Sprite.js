const {
    boolean,
    Vector2,
    Nullable,
} = require('../parse_utils');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'Sprite',
        texture: Nullable(data.prop.texture),
        offset: Vector2(data.prop.offset),
    });

    // Set anchor based on `center`
    const centered = boolean(data.prop.centered);
    if (centered !== undefined && !centered) {
        res.anchor = { x: 0, y: 0 };
    }

    return res;
};
