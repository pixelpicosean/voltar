const _ = require('lodash');

module.exports = (data) => undefined;

module.exports.is_tres = false;
module.exports.ignore = false;

/**
 * @typedef {{ attr: any, key: string, prop: any }} Data
 */

/**
 * @param {string} str
 */
function pascal_case(str) {
    return _.upperFirst(_.camelCase(str))
}

const extension_prefix = 'res://extension/2d/'

/** @param {Data} data */
module.exports.extra_process = (data) => {
    if (data.attr.path.startsWith(extension_prefix)) {
        const filename = data.attr.path
            .replace(extension_prefix, '')
            .replace(/\.gd$/, '')
        return {
            type: 'ReplaceNode',
            meta: pascal_case(filename),
            // we don't save this as extra resource in the end
            extra: undefined,
        }
    }
};
