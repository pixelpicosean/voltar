const {
    real,
    boolean,
} = require('../../parser/type_converters');

const Node = require('./Node');

module.exports = (data) => {
    const res = Object.assign({}, Node(data), {
        type: 'Timer',

        wait_time: real(data.prop.wait_time),
        autostart: boolean(data.prop.autostart),
        one_shot: boolean(data.prop.one_shot),
        process_mode: data.prop.process_mode,
    });

    return res;
};

module.exports.is_tres = true;
