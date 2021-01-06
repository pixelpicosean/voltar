import { Color } from "engine/core/color";
import {
    MARGIN_LEFT,
    MARGIN_BOTTOM,
    MARGIN_TOP,
    MARGIN_RIGHT,
} from "engine/core/math/math_defs";

import { StyleBox } from "./style_box";
import { BitmapFont, DynamicFont } from "./font";


export const default_font_name = 'mini';

let default_font: BitmapFont | DynamicFont = null;
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

    static set_default_font(font: BitmapFont | DynamicFont) {
        default_font = font;
    }

    default_theme_font: BitmapFont = undefined;

    icon_map = Object.create(null);
    style_map = Object.create(null);
    font_map = Object.create(null);
    color_map = Object.create(null);
    constant_map = {
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

    /**
     * @param {string} name
     * @param {string} type
     * @returns {StyleBox}
     */
    get_stylebox(name: string, type: string): StyleBox {
        if (this.style_map[type]) {
            let style = this.style_map[type][name];
            if (style) {
                return style;
            }
        }

        return default_style;
    }

    get_font(name: string, type: string): BitmapFont | DynamicFont {
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
    get_color(name: string, type: string): Color {
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
    get_constant(name: string, type: string): number {
        // @ts-ignore
        return this.constant_map[type][name];
    }
}

const default_theme = new Theme();
