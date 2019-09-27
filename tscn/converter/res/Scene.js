const {
    path,
    int,
    string,
} = require('../../parser/type_converters');

module.exports = (data) => {
    const res = {
        // keep these, will be handled later
        _attr: data.attr,
        _prop: data.prop,

        key: data.key,
        type: 'Scene',
        index: int(data.attr.index),
        name: string(data.attr.name),
        parent: path(data.attr.parent),

        instance: data.attr.instance,
    };

    return res;
};

module.exports.is_tres = () => true;
