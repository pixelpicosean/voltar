const {
    real,
    boolean,
    Vector2,
} = require('../parse_utils');

const CollisionObject2D = require('./CollisionObject2D');

module.exports = (data) => {
    const res = Object.assign({}, CollisionObject2D(data), {
        type: 'StaticBody2D',
    });

    res.constant_linear_velocity = Vector2(data.prop.constant_linear_velocity);
    res.constant_angular_velocity = real(data.prop.constant_angular_velocity);
    res.friction = real(data.prop.friction);
    res.bounce = real(data.prop.bounce);

    return res;
};
