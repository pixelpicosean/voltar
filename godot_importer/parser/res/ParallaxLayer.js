const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'ParallaxLayer',
        motion_mirroring: data.prop.motion_mirroring,
        motion_offset: data.prop.motion_offset,
        motion_scale: data.prop.motion_scale,
    });
};
