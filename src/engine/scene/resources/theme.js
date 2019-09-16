import { Color } from "engine/core/color";
import {
    MARGIN_LEFT,
    MARGIN_BOTTOM,
    MARGIN_TOP,
    MARGIN_RIGHT,
} from "engine/core/math/math_defs";

import { StyleBox } from "./style_box";
import { Font } from "./font";


export const default_font_name = '04b03';

let default_font = null;
const default_style = (() => {
    const style = new StyleBox();
    style.set_default_margin(MARGIN_BOTTOM, 0);
    style.set_default_margin(MARGIN_LEFT, 0);
    style.set_default_margin(MARGIN_TOP, 0);
    style.set_default_margin(MARGIN_RIGHT, 0);
    return style;
})();

const White = Object.freeze(new Color(1, 1, 1, 1));

export class Theme {
    static get_default() {
        return default_theme;
    }

    /**
     * @param {Font} font
     */
    static set_default_font(font) {
        default_font = font;
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
            Label: {
                line_spacing: 3,
            },
        };
    }

    /**
     * @param {string} name
     * @param {string} type
     * @returns {StyleBox}
     */
    get_stylebox(name, type) {
        if (this.style_map[type]) {
            let style = this.style_map[type][name];
            if (style) {
                return style;
            }
        }

        return default_style;
    }

    /**
     * @param {string} name
     * @param {string} type
     * @returns {Font}
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
     * @returns {Color}
     */
    get_color(name, type) {
        if (this.color_map[type]) {
            let color = this.color_map[type][name];
            if (color) {
                return color;
            }
        }

        return White;
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
