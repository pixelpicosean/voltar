const Node2D = require('./CanvasItem');

module.exports = (data) => {
    const res = Object.assign({}, Node2D(data), {
        type: 'CollisionShape2D',
        shape: data.prop.shape,
    });

    return res;
};
