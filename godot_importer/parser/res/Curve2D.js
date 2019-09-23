const {
    PoolRealArray,
} = require('../type_converters');

module.exports = (data) => {
    const res = {
        id: data.attr.id,
        type: data.attr.type,
        points: PoolRealArray(data.prop._data.points),
    };

    return res;
};
