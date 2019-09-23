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
        type: '',
        name: string(data.attr.name),
        parent: path(data.attr.parent),

        prop: data.prop,
    };
};

module.exports.is_tres = () => true;
