const {
    path,
    int,
    string,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        key: data.key,
        index: int(data.attr.index),
        type: 'Scene',
        name: string(data.attr.name),
        parent: path(data.attr.parent),
        instance: data.attr.instance,

        prop: data.prop,
    };
};
