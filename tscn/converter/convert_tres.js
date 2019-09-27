const _ = require('lodash');

const { convert_block } = require('./convert_block');
const { normalize_resource_object } = require('./resource_normalizer');

/**
 * @param {{ key: string, attr: any, prop: any }[]} blocks
 */
module.exports.convert_tres = (blocks) => {
    const sections = blocks.map(convert_block)

    const head = sections.shift();

    if (head.key === 'gd_resource') {
        // FIXME: do we have sub/ext resource inside a tres resource?
        const converter = require(`./res/${head.attr.type}`);
        return converter({
            attr: head.attr,
            prop: sections[0].prop,
        });
    } else if (head.key === 'gd_scene') {
        const ext = {};
        const sub = {};
        const nodes = [];

        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            if (sec.key === 'ext_resource') {
                const converter = require(`./res/${sec.attr.type}`);
                if (typeof (converter.get_resource_path) === 'function') {
                    ext[sec.attr.id] = converter.get_resource_path(sec);
                } else {
                    ext[sec.attr.id] = sec.attr.path;
                }
            } else if (sec.key === 'sub_resource') {
                sub[sec.id] = sec;
                sec.key = undefined;
                sec.id = undefined;
            } else if (sec.key === 'node') {
                // we don't normalize instance nodes now
                // since we don't know their type yet
                if (!sec.instance) {
                    sec._prop = undefined;
                    sec.key = undefined;
                    normalize_resource_object(sec);
                }
                nodes.push(sec);
            }
        }

        return {
            type: 'PackedScene',
            ext,
            sub,
            nodes,
        };
    } else {
        throw `TRES of type "${head.key}" is not supported`;
    }
}
