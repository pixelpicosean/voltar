const {
    boolean,
    NodePath,
} = require('../../parser/type_converters');

const Node2D = require('./Node2D');

module.exports = (data) => {
    return Object.assign(Node2D(data), {
        type: 'RemoteTransform2D',
        remote_path: NodePath(data.prop.remote_path),
        update_position: boolean(data.prop.update_position),
        update_rotation: boolean(data.prop.update_rotation),
        update_scale: boolean(data.prop.update_scale),
        use_global_coordinates: boolean(data.prop.use_global_coordinates),
    });
};

module.exports.is_tres = true;
