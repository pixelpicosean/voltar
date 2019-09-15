/**
 * @param {string} str
 * @param {any} [opts]
 */
export default function parse_uri(str, opts = {}) {
    const o = {
        key: ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'],
        q: {
            name: 'queryKey',
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g,
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
        },
    }

    const m = o.parser[opts.strictMode ? 'strict' : 'loose'].exec(str);
    const uri = {};
    let i = 14;

    while (i--) uri[o.key[i]] = m[i] || ''

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, (_0, _1, _2) => {
        if (_1) uri[o.q.name][_1] = _2;
    });

    return uri;
}
