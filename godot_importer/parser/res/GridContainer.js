const {
    int,
} = require('../parse_utils');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'GridContainer',
    });

    res.columns = int(data.prop.columns);
    res.hseparation = int(data.prop['custom_constants/hseparation']);
    res.vseparation = int(data.prop['custom_constants/vseparation']);

    return res;
};
