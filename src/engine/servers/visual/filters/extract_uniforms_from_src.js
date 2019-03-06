import default_value from 'engine/drivers/webgl/shader/default_value';

/**
 * @param {string} vertex_src
 * @param {string} fragment_src
 */
export default function extract_uniforms_from_src(vertex_src, fragment_src) {
    const vert_uniforms = extract_uniforms_from_string(vertex_src);
    const frag_uniforms = extract_uniforms_from_string(fragment_src);

    return Object.assign({}, vert_uniforms, frag_uniforms);
}

/**
 * @param {string} string
 */
function extract_uniforms_from_string(string) {
    const mask_regex = new RegExp('^(projection_matrix|u_sampler|filter_area|filter_clamp)$');

    /** @type {Object<string, { value: any, name: string, type: string }>} */
    const uniforms = {};

    /** @type {string[]} */
    let name_split = null;

    // clean the lines a little - remove extra spaces / tabs etc
    // then split along ';'
    const lines = string.replace(/\s+/g, ' ')
        .split(/\s*;\s*/);

    // loop through..
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.indexOf('uniform') > -1) {
            const split_line = line.split(' ');
            const type = split_line[1];

            let name = split_line[2];
            let size = 1;

            if (name.indexOf('[') > -1) {
                // array!
                name_split = name.split(/\[|]/);
                name = name_split[0];
                size *= Number(name_split[1]);
            }

            if (!name.match(mask_regex)) {
                uniforms[name] = {
                    value: default_value(type, size),
                    name,
                    type,
                };
            }
        }
    }

    return uniforms;
}
