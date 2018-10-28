const _ = require('lodash');
const {
    path,
    boolean,
    Vector2,
} = require('../parse_utils');

const Node2D = require('./Node2D');

module.exports = (data) => {
    const res = Object.assign({}, {
        parent: path(data.attr.parent),
        _is_proxy_: true,
        position: Vector2(data.prop.position),
        prop_key: 'shape',
        prop_value: data.prop.shape,
    });

    return res;
};
