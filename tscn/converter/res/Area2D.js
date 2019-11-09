const {
    real,
    boolean,
    Vector2,
} = require('../../parser/type_converters');

const CollisionObject2D = require('./CollisionObject2D');

module.exports = (data) => {
    const res = Object.assign({}, CollisionObject2D(data), {
        type: 'Area2D',
        gravity_point: boolean(data.prop.gravity_point),
        gravity_distance_scale: real(data.prop.gravity_distance_scale),
        gravity_vec: Vector2(data.prop.gravity_vec),
        gravity: real(data.prop.gravity),
        linear_damp: real(data.prop.linear_damp),
        angular_damp: real(data.prop.angular_damp),
    });

    return res;
};

module.exports.is_tres = true;
