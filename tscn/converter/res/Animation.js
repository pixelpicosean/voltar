const _ = require('lodash');
const {
    NodePath,
    PoolRealArray,
    GeneralArray,
    MethodArray,
} = require('../../parser/type_converters');

module.exports = (data) => {
    const anim = {
        id: data.attr.id,
        type: 'Animation',
        name: data.prop.resource_name,
        length: data.prop.length,
        loop: data.prop.loop,
        step: data.prop.step,
        tracks: [],
    };

    // Support up to 128 tracks per animation
    for (let i = 0; i < 128; i++) {
        let track_pre = `tracks/${i}`;

        if (!_.has(data.prop, `${track_pre}/type`)) {
            break;
        }

        let keys_data = data.prop[`${track_pre}/keys`];
        if (!keys_data.values) {
            console.log('does not have values');
        }
        let track_type = data.prop[`${track_pre}/type`];
        let track = {
            type: track_type,
            path: NodePath(data.prop[`${track_pre}/path`]),
            interp: data.prop[`${track_pre}/interp`],
            loop_wrap: data.prop[`${track_pre}/loop_wrap`],
            // imported: boolean(data.prop[`${track_pre}/imported`]),
            enabled: data.prop[`${track_pre}/enabled`],
            keys: {
                times: PoolRealArray(keys_data.times),
                transitions: PoolRealArray(keys_data.transitions),
                update: keys_data.update,
                values: (track_type === 'method') ? MethodArray(keys_data.values) : GeneralArray(keys_data.values),
            },
        };

        if (track.keys.values.length && track.keys.values[0].length === 12) {
            track.value_type = "Transform";
        }

        anim.tracks.push(track);
    }

    return anim;
};

module.exports.is_tres = true;
