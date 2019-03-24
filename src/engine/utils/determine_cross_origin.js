import _url from 'url';

/** @type {HTMLAnchorElement} */
let temp_anchor;

/**
 * Sets the `crossOrigin` property for this resource based on if the url
 * for this resource is cross-origin. If crossOrigin was manually set, this
 * function does nothing.
 * Nipped from the resource loader!
 *
 * @param {string} url_str - The url to test.
 * @param {object} [loc] - The location object to test against.
 * @return The crossOrigin value to use (or empty string for none).
 */
export default function determine_cross_origin(url_str, loc = window.location) {
    // data: and javascript: urls are considered same-origin
    if (url_str.indexOf('data:') === 0) {
        return '';
    }

    // default is window.location
    loc = loc || window.location;

    if (!temp_anchor) {
        temp_anchor = document.createElement('a');
    }

    // let the browser determine the full href for the url of this resource and then
    // parse with the node url lib, we can't use the properties of the anchor element
    // because they don't work in IE9 :(
    temp_anchor.href = url_str;
    const url = _url.parse(temp_anchor.href);

    const same_port = (!url.port && loc.port === '') || (url.port === loc.port);

    // if cross origin
    if (url.hostname !== loc.hostname || !same_port || url.protocol !== loc.protocol) {
        return 'anonymous';
    }

    return '';
}
