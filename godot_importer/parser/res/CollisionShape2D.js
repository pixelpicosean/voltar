const _ = require('lodash');
const {
    path,
    Vector2,
} = require('../parse_utils');
const Node2D = require('./Node2D');

const shapes = {
    'CircleShape2D': require('./CircleShape2D'),
    'RectangleShape2D': require('./RectangleShape2D'),
    'SegmentShape2D': require('./SegmentShape2D'),
};

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'CollisionShape2D',
        shape: data.prop.shape,
    });

    return res;
};
