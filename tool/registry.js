/** @type {{ [type: string]: any[] }}} */
let record = {}

/**
 * @param {string} type
 * @param {any} data
 */
module.exports.record_data_with_type = function(type, data) {
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
module.exports.get_all_records = function(type) {
    return record[type];
}

/** @type {{ [type: string]: { filename: string }[] }}} */
let non_tres_record = {}

/**
 * @param {string} type
 * @param {{ filename: string }} data
 */
module.exports.add_non_tres_data = function(type, data) {
    let list = non_tres_record[type];
    if (!list) {
        list = non_tres_record[type] = [];
    }
    if (list.indexOf(data) < 0) {
        list.push(data);
    }
}

module.exports.get_non_tres_resources = function() {
    return non_tres_record;
}

/** @type {string[]} */
let resource_check_ignores = [];
/**
 * @param {string} key
 */
module.exports.add_to_resource_check_ignores = function(key) {
    if (resource_check_ignores.indexOf(key) < 0) {
        resource_check_ignores.push(key);
    }
}

module.exports.get_resource_check_ignores = function() {
    return resource_check_ignores;
}

/* general JSON data API */

let json_data = [];
module.exports.add_json_resource = function(data) {
    json_data.push(data);
    return json_data.length - 1;
}
module.exports.get_json_packs = function() {
    return json_data;
}

/* binary file API */

const BINARY_PACK_SIZE = 1024 * 1024 * 8; // max to 8MB per file

/** @type {Buffer[]} */
let binary_packs = [];
let current_pack_capacity = BINARY_PACK_SIZE;

function append_new_buffer() {
    let buffer = Buffer.alloc(BINARY_PACK_SIZE);
    binary_packs.push(buffer);
    current_pack_capacity = BINARY_PACK_SIZE;
    return buffer;
}
append_new_buffer();

function trim_current_buffer() {
    let buffer = binary_packs[binary_packs.length - 1];
    binary_packs[binary_packs.length - 1] = buffer.subarray(0, BINARY_PACK_SIZE - current_pack_capacity);
}

/**
 * @param {number} length
 */
function fetch_pack_for(length) {
    /** @type {Buffer} */
    let buffer = binary_packs[binary_packs.length - 1];
    if (current_pack_capacity < length) {
        trim_current_buffer();
        buffer = append_new_buffer();
    }
    return buffer;
}

/**
 * @param {ArrayBuffer | Float32Array | Uint8Array | Uint16Array | Uint32Array} binary
 */
module.exports.add_binary_resource = function(binary) {
    let buffer = fetch_pack_for(binary.byteLength);
    let offset = BINARY_PACK_SIZE - current_pack_capacity;

    buffer.set(binary, offset);

    current_pack_capacity -= binary.byteLength;

    return {
        index: binary_packs.length - 1,
        offset,
        length: binary.byteLength,
    }
}

module.exports.get_binary_packs = function() {
    trim_current_buffer();
    return binary_packs;
}
