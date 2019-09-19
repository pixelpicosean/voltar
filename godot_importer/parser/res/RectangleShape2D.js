const {
    Vector2,
} = require('../parse_utils');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
        extents: Vector2(data.prop.extents),
    };

    return res;
};
