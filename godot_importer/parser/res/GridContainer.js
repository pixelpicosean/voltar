const {
    int,
} = require('../parse_utils');

const Container = require('./Container');

module.exports = (data) => {
    const res = Object.assign({}, Container(data), {
        type: 'GridContainer',
    });

    res.columns = int(data.prop.columns);

    return res;
};
