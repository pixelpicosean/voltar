const _ = require('lodash');

const { get_array_index_and_prop_key } = require('../parser/type_converters');

module.exports = (data) => {
    const array = [];

    // check whether this resource is an array
    for (const key in data.prop) {
        const { index, prop_key } = get_array_index_and_prop_key(key);
        if (_.isFinite(index) && _.isString(prop_key)) {
            array[index] = array[index] || {};
            array[index][prop_key] = data.prop[key];
        }
    }
    if (!_.isEmpty(array)) {
        data.prop = array;
    }

    return require(`./res/${data.attr.type}`)(data);
};
