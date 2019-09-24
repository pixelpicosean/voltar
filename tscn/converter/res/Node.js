const {
    string,
    path,
    int,
} = require('../../parser/type_converters');

module.exports = (data) => {
    const node = {
        key: data.key,
        index: int(data.attr.index),
        type: 'Node',
        name: string(data.attr.name),
        parent: path(data.attr.parent),
        groups: undefined,
        pause_mode: int(data.prop.pause_mode),
    };

    if (Array.isArray(data.attr.groups)) {
        node.groups = data.attr.groups.filter(g => g.length > 0);
    }

    // Save properties so we can do some post-process
    node._prop = data.prop;

    return node;
};

module.exports.is_tres = () => true;
