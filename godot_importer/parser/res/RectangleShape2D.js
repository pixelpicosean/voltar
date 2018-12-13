const _ = require('lodash');
const {
    Vector2,
} = require('../parse_utils');

module.exports = (data) => {
    const res = {
        _is_proxy_: true,
        id: data.attr.id,
        type: data.attr.type,
        extents: Vector2(data.prop.extents),
    };

    return res;
};
