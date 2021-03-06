const _ = require('lodash');
const {
    real,
} = require('../../parser/type_converters');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
        radius: real(data.prop.radius),
        height: real(data.prop.height),
    };

    return res;
};

module.exports.is_tres = true;
