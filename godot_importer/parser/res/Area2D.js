const _ = require('lodash');
const {
    real,
    Vector2,
} = require('../parse_utils');

const CollisionObject2D = require('./CollisionObject2D');

module.exports = (data) => {
    const res = Object.assign({}, CollisionObject2D(data), {
        type: 'Area2D',
    });
    res.gravity_vec = Vector2(data.prop.gravity_vec);
    res.gravity = real(data.prop.gravity);
    res.linear_damp = real(data.prop.linear_damp);
    res.angular_damp = real(data.prop.angular_damp);

    return res;
};
