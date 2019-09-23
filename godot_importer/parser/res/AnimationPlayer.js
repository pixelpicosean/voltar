const {
    string,
    real,
    NodePath,
} = require('../type_converters');

const Node = require('./Node');

module.exports = (data) => {
    const res = Object.assign({}, Node(data), {
        type: 'AnimationPlayer',
        autoplay: string(data.prop.autoplay),
        root_node: NodePath(data.prop.root_node),
        playback_speed: real(data.prop.playback_speed),
        anims: {},
    });

    for (let k in data.prop) {
        if (k.indexOf('anims/') >= 0) {
            let name = k.replace('anims/', '');
            res.anims[name] = data.prop[k];
        }
    }

    return res;
};
