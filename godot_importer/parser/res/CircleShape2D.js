const _ = require('lodash');
const {
    real,
} = require('../parse_utils');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
        radius: real(data.prop.radius),
    };

    return res;
};
