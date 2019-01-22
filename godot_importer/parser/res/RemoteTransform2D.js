const Node2D = require('./Node2D');
const {
    NodePath,
} = require('../parse_utils');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'RemoteTransform2D',
        remote_path: NodePath(data.prop.remote_path),
        update_position: data.prop.update_position,
        update_rotation: data.prop.update_rotation,
        update_scale: data.prop.update_scale,
        use_global_coordinates: data.prop.use_global_coordinates,
    });
};
