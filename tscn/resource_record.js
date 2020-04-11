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

/** @type {string[]} */
let resource_lookup_skip_list = [];
/**
 * @param {string} key
 */
module.exports.add_to_resource_lookup_skip_list = function(key) {
    if (resource_lookup_skip_list.indexOf(key) < 0) {
        resource_lookup_skip_list.push(key);
    }
}

module.exports.get_resource_lookup_skip_list = function() {
    return resource_lookup_skip_list;
}
