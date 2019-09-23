const _ = require('lodash');
const {
    string,
    int,
    real,
    boolean,
    NodePath,
    PoolRealArray,
    GeneralArray,
    MethodArray,
} = require('../../parser/type_converters');


const get_prop_name = (path) => _.last(path.split(':'));

const trans_rotation_track = (track) => {
    track.path = track.path.replace(get_prop_name(track.path), 'rotation');
    track.keys.values = track.keys.values.map(deg => deg / 180 * Math.PI);
    return track;
};

const TrackProcs = {
    'rotation_degrees': trans_rotation_track,
    'rect_rotation': trans_rotation_track,
};
const transform_track = (track) => {
    const type = get_prop_name(track.path);
    if (_.keys(TrackProcs).indexOf(type) >= 0) {
        TrackProcs[type](track);
    }
};

module.exports = (data) => {
    const anim = {
        id: int(data.attr.id),
        type: 'Animation',
        name: string(data.prop.resource_name),
        length: real(data.prop.length),
        loop: boolean(data.prop.loop),
        step: real(data.prop.step),
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
        let track_type = string(data.prop[`${track_pre}/type`]);
        let track = {
            type: track_type,
            path: NodePath(data.prop[`${track_pre}/path`]),
            interp: int(data.prop[`${track_pre}/interp`]),
            loop_wrap: boolean(data.prop[`${track_pre}/loop_wrap`]),
            // imported: boolean(data.prop[`${track_pre}/imported`]),
            enabled: boolean(data.prop[`${track_pre}/enabled`]),
            keys: {
                times: PoolRealArray(keys_data.times),
                transitions: PoolRealArray(keys_data.transitions),
                update: int(keys_data.update),
                values: (track_type === 'method') ? MethodArray(keys_data.values) : GeneralArray(keys_data.values),
            },
        };
        transform_track(track);

        anim.tracks.push(track);
    }

    return anim;
};

module.exports.is_tres = () => true;
