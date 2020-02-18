const _ = require('lodash');


/**
 * @param {string} data
 * @returns {string[][]}
 */
module.exports.split_to_blocks = (data) => {
    const blocks = [];

    const lines = data.split('\n').filter(str => str.length > 0);
    let i = 0, line, block = [];
    for (i = 0; i < lines.length; i++) {
        line = lines[i];

        // Reach a block head
        if (line[0] === '[') {
            // Is it a one-line head?
            if (_.last(line) === ']') {
                // Save current block
                blocks.push(block);

                // Start a new block
                block = [line];
            }
            // So it's a multi-line head
            else {
                // Loop through lines to find all the closing brackets
                let close_brackets_to_be_found = 0;
                let content = '';
                inner: for (; i < lines.length; i++) {
                    let inner_line = lines[i];

                    // Concate the lines since head is only allowed
                    // to be one-line
                    content = `${content} ${inner_line}`;

                    // How many [ do we have in this line?
                    close_brackets_to_be_found += (inner_line.match(/\[/g) || []).length;

                    // How many ] do we have in this line?
                    close_brackets_to_be_found -= (inner_line.match(/\]/g) || []).length;

                    // Are we done?
                    if (close_brackets_to_be_found === 0) {
                        // Save current block
                        blocks.push(block);

                        // Start a new block
                        block = [content.trim()];
                        break inner;
                    }
                }
            }
        } else {
            block.push(line);
        }
    }
    blocks.push(block);

    return blocks.filter(b => b.length > 0);
}
