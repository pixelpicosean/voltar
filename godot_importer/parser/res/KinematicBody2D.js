const {
    real,
} = require('../parse_utils');

const CollisionObject2D = require('./CollisionObject2D');

module.exports = (data) => {
    const res = Object.assign({}, CollisionObject2D(data), {
        type: 'KinematicBody2D',
        safe_margin: real(data.prop.safe_margin),
    });

    return res;
};
