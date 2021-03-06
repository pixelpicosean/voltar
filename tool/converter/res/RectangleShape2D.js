const {
    Vector2,
} = require('../../parser/type_converters');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
        extents: Vector2(data.prop.extents),
    };

    return res;
};

module.exports.is_tres = true;
