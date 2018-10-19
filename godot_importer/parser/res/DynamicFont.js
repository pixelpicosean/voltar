const {
    int,
    url,
} = require('../parse_utils');

module.exports = (data) => {
    return {
        id: int(data.attr.id),
        type: 'DynamicFont',
        size: int(data.prop.size),
        font_data: data.prop.font_data,
    };
};
