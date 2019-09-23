const {
    real,
    boolean,
    Vector2,
} = require('../type_converters');

const CollisionObject2D = require('./CollisionObject2D');

module.exports = (data) => {
    const res = Object.assign({}, CollisionObject2D(data), {
        type: 'RigidBody2D',
        mass: real(data.prop.mass),
        friction: real(data.prop.friction),
        bounce: real(data.prop.bounce),
        gravity_scale: real(data.prop.gravity_scale),
        sleeping: boolean(data.prop.sleeping),
        can_sleep: boolean(data.prop.can_sleep),
        linear_damp: real(data.prop.linear_damp),
        linear_velocity: Vector2(data.prop.linear_velocity),
        angular_damp: real(data.prop.angular_damp),
        angular_velocity: real(data.prop.angular_velocity),
        applied_force: Vector2(data.prop.applied_force),
        applied_torque: real(data.prop.applied_torque),
    });

    return res;
};
