const {
    Vector2,
} = require('../../parser/type_converters');

const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'ParallaxLayer',
        motion_mirroring: Vector2(data.prop.motion_mirroring),
        motion_offset: Vector2(data.prop.motion_offset),
        motion_scale: Vector2(data.prop.motion_scale),
    });
};

module.exports.is_tres = true;
