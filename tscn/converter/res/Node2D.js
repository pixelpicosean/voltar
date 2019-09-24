const {
    int,
    real,
    boolean,
    Vector2,
} = require('../../parser/type_converters');

const CanvasItem = require('./CanvasItem');

module.exports = (data) => {
    const res = Object.assign({}, CanvasItem(data), {
        type: 'Node2D',
        position: Vector2(data.prop.position),
        rotation: real(data.prop.rotation),
        scale: Vector2(data.prop.scale),
        z_as_relative: boolean(data.prop.z_as_relative),
        z_index: int(data.prop.z_index),
    });

    return res;
};

module.exports.is_tres = () => true;
