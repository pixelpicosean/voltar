const _ = require('lodash');
const {
    string,
    path,
    int,
    real,
    boolean,
    Vector2,
    Color,
} = require('../parse_utils');

module.exports = (data) => {
    const node = {
        key: data.key,
        index: int(data.attr.index),
        type: 'Node2D',
        name: string(data.attr.name),
        parent: path(data.attr.parent),
        groups: undefined,
        position: Vector2(data.prop.position),
        rotation: real(data.prop.rotation),
        scale: Vector2(data.prop.scale),
        modulate: Color(data.prop.modulate),
        self_modulate: Color(data.prop.self_modulate),
        visible: boolean(data.prop.visible),
    };

    if (Array.isArray(data.attr.groups)) {
        node.groups = data.attr.groups.filter(g => g.length > 0);
    }

    // Save properties so we can do some post-process
    node._prop = data.prop;

    return node;
};
