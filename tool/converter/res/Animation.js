const _ = require('lodash');
const {
    NodePath,
    PoolRealArray,
    PoolStringArray,
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

    // Support up to 512 tracks per animation
    for (let i = 0; i < 512; i++) {
        let track_pre = `tracks/${i}`;
        let track_type = data.prop[`${track_pre}/type`];

        if (!track_type) {
            break;
        }

        let keys_data = data.prop[`${track_pre}/keys`];

        let times = [];
        let transitions = [];
        let values = [];

        let packed_transform = false;
        if (track_type === 'transform') {
            for (let i = 0; i < keys_data.length; i += 12) {
                times.push(keys_data[i + 0]);
                transitions.push(keys_data[i + 1]);
                values.push(
                    // location
                    keys_data[i + 2],
                    keys_data[i + 3],
                    keys_data[i + 4],
                    // rotation
                    keys_data[i + 5],
                    keys_data[i + 6],
                    keys_data[i + 7],
                    keys_data[i + 8],
                    // scale
                    keys_data[i + 9],
                    keys_data[i + 10],
                    keys_data[i + 11],
                )
            }
            packed_transform = true;
        } else if (track_type === 'method') {
            times = PoolRealArray(keys_data.times);
            transitions = PoolRealArray(keys_data.transitions);
            values = MethodArray(keys_data.values);
        } else if (track_type === 'animation') {
            times = PoolRealArray(keys_data.times);
            transitions = PoolRealArray(keys_data.transitions);
            values = PoolStringArray(keys_data.clips);
        } else {
            times = PoolRealArray(keys_data.times);
            transitions = PoolRealArray(keys_data.transitions);
            values = GeneralArray(keys_data.values);
        }

        let track = {
            type: track_type,
            path: NodePath(data.prop[`${track_pre}/path`]),
            interp: data.prop[`${track_pre}/interp`],
            loop_wrap: data.prop[`${track_pre}/loop_wrap`],
            enabled: data.prop[`${track_pre}/enabled`],
            keys: {
                times,
                transitions,
                update: keys_data.update,
                values,
            },
        };

        if (track_type === 'transform' && packed_transform) {
            track.value_type = "PackedTransform";
        } else if (track_type === 'value' && Array.isArray(track.keys.values[0]) && track.keys.values[0].length === 12) {
            track.value_type = "Transform";
        }

        anim.tracks.push(track);
    }

    return anim;
};

module.exports.is_tres = true;
