const {
    path,
    int,
    string,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        _attr: data.attr,

        key: data.key,
        index: int(data.attr.index),
        type: 'Scene',
        name: string(data.attr.name),
        filename: data.key,
        parent: path(data.attr.parent),
        instance: data.attr.instance,

        prop: data.prop,
    };
};
