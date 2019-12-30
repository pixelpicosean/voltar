const {
    int,
    real,
} = require('../../parser/type_converters');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'GridContainer',
        columns: int(data.prop.columns),
        'custom_constants/hseparation': real(data.prop['custom_constants/hseparation']),
        'custom_constants/vseparation': real(data.prop['custom_constants/vseparation']),
    });

    return res;
};

module.exports.is_tres = true;
