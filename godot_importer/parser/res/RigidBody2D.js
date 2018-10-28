const {
    real,
    boolean,
    Vector2,
} = require('../parse_utils');

const CollisionObject2D = require('./CollisionObject2D');

module.exports = (data) => {
    const res = Object.assign({}, CollisionObject2D(data), {
        type: 'RigidBody2D',
    });

    res.mass = real(data.prop.mass);
    res.friction = real(data.prop.friction);
    res.bounce = real(data.prop.bounce);
    res.gravity_scale = real(data.prop.gravity_scale);
    res.sleeping = boolean(data.prop.sleeping);
    res.can_sleep = boolean(data.prop.can_sleep);

    res.linear_damp = real(data.prop.linear_damp);
    res.linear_velocity = Vector2(data.prop.linear_velocity);
    res.angular_damp = real(data.prop.angular_damp);
    res.angular_velocity = real(data.prop.angular_velocity);
    res.applied_force = Vector2(data.prop.applied_force);
    res.applied_torque = real(data.prop.applied_torque);

    return res;
};
