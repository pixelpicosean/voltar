const Spatial = require('./Spatial');

module.exports = (data) => {
    return Object.assign(Spatial(data), {
        type: 'Camera',
    });
};

module.exports.is_tres = true;
