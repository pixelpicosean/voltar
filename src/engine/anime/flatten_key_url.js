/**
 * @param {string} full_path 
 * @returns {Array<string>}
 */
export default function flatten_key_url(full_path) {
    return full_path.split('.');
}
