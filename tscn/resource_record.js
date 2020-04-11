/** @type {{ [type: string]: any[] }}} */
let record = {}

/**
 * @param {string} type
 * @param {any} data
 */
module.exports.add = function(type, data) {
    let list = record[type];
    if (!list) {
        list = record[type] = [];
    }
    if (list.indexOf(data) < 0) {
        list.push(data);
    }
}

/**
 * @param {string} type
 */
module.exports.get_list = function(type) {
    return record[type];
}
