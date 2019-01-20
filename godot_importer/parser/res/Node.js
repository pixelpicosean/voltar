const Node2D = require('./Node2D');

module.exports = (data) => {
    const node = Node2D(data);
    node.has_transform = false;
    node.interactive = false;
    return node;
};
