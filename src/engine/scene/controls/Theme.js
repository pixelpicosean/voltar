export default class Theme {
    static get_default() {
        return default_theme;
    }

    constructor() {
        this.constants = {};
    }

    /**
     * @param {string} name
     * @param {string} type
     * @returns {number}
     */
    get_constant(name, type) {
        return this.constants[type][name];
    }
}

const default_theme = (() => {
    const t = new Theme();

    t.constants.HBoxContainer = t.constants.VBoxContainer = {
        separation: 4,
    };

    return t;
})();
