const default_font = '04b03';

export default class Theme {
    static get_default() {
        return default_theme;
    }

    constructor() {
        this.default_theme_font = undefined;

        this.icon_map = {};
        this.style_map = {};
        this.font_map = {};
        this.color_map = {};
        this.constant_map = {
            MarginContainer: {
                margin_bottom: 0,
                margin_left: 0,
                margin_top: 0,
                margin_right: 0,
            },
            HBoxContainer: {
                separation: 4,
            },
            VBoxContainer: {
                separation: 4,
            },
            GridContainer: {
                hseparation: 4,
                vseparation: 4,
            },
        };
    }

    /**
     * @param {string} name
     * @param {string} type
     * @returns {string}
     */
    get_font(name, type) {
        if (this.font_map[type]) {
            let font = this.font_map[type][name];
            if (font) {
                return font;
            }
        }

        if (this.default_theme_font) {
            return this.default_theme_font;
        }

        return default_font;
    }

    /**
     * @param {string} name
     * @param {string} type
     * @returns {number}
     */
    get_constant(name, type) {
        return this.constant_map[type][name];
    }
}

const default_theme = new Theme();
