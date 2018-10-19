const {
    string,
    path,
    int,
    real,
    NodePath,
} = require('../parse_utils');

module.exports = (data) => {
    const res = {
        index: int(data.attr.index),
        type: 'AnimationPlayer',
        name: string(data.attr.name),
        parent: path(data.attr.parent),
        root_node: NodePath(data.prop.root_node),
        playback_speed: real(data.prop.playback_speed),
        anims: {},
    };

    for (let k in data.prop) {
        if (k.indexOf('anims/') >= 0) {
            let name = k.replace('anims/', '');
            res.anims[name] = data.prop[k];
        }
    }

    return res;
};
