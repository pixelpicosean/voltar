const _ = require('lodash');
const {
    path,
    Vector2,
} = require('../parse_utils');

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
