const {
    real,
} = require('../type_converters');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
        a: real(data.prop.a),
        b: real(data.prop.b),
    };

    return res;
};
