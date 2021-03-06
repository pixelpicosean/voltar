const {
    boolean,
} = require('../../parser/type_converters');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'CenterContainer',
        use_top_left: boolean(data.prop.use_top_left),
    });

    return res;
};

module.exports.is_tres = true;
