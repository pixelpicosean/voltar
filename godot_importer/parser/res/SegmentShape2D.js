const {
    real,
} = require('../parse_utils');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
        a: real(data.prop.a),
        b: real(data.prop.b),
    };

    return res;
};
