const {
    string,
    path,
    int,
    real,
    Vector2,
    Color,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        key: data.key,
        index: int(data.attr.index),
        type: 'Scene',
        name: string(data.attr.name),
        parent: path(data.attr.parent),
        instance: data.attr.instance,
        position: Vector2(data.prop.position),
        rotation: real(data.prop.rotation),
        scale: Vector2(data.prop.scale),
        modulate: Color(data.prop.modulate),
    };
};
