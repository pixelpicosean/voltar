module.exports = (data) => {
    // Node
    if (data.attr.type) {
        return Object.assign({
            key: 'node',
        }, require(`./res/${data.attr.type}`)(data));
    }
    // Scene
    else if (data.attr.instance) {
        return Object.assign({
            key: 'node',
        }, require(`./res/Scene`)(data));
    }
    // Node of inherited scene?
    else {
        return Object.assign(require(`./res/Scene`)(data), {
            type: undefined,
            key: 'inherited_node',
        });
    }
};
