const fs = require("fs-extra");
const path = require("path");

const copy_ignores = [
    ".DS_Store",
];

let source = path.resolve(__dirname, "../media");
let target = path.resolve(__dirname, "../dist/media");
fs.copy(source, target, {
    filter: (src, dest) => {
        return copy_ignores.indexOf(path.basename(src)) < 0;
    }
});
