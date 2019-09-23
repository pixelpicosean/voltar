const {
    path,
    int,
    string,
} = require('../../parser/type_converters');

module.exports = (data) => {
    return {
        _attr: data.attr,

        key: data.key,
        index: int(data.attr.index),
        type: 'Scene',
        name: string(data.attr.name),
        filename: data.attr.instance,
        parent: path(data.attr.parent),
        instance: data.attr.instance,

        prop: data.prop,
    };
};

module.exports.is_tres = () => true;
