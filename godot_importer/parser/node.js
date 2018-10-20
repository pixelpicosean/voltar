module.exports = (data) => {
    // Node
    if (data.attr.type) {
        return Object.assign({
            key: 'node',
        }, require(`./res/${data.attr.type}`)(data));
    }
    // Scene
    else {
        return Object.assign({
            key: 'node',
        }, require(`./res/Scene`)(data));
    }
};
