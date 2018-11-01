import StyleBox from "./StyleBox";
import { Margin } from "../controls/const";
import Font from "./Font";

export const default_font_name = '04b03';

let default_font = null;
const default_style = (() => {
    const style = new StyleBox();
    style.set_default_margin(Margin.Bottom, 2);
    style.set_default_margin(Margin.Left, 2);
    style.set_default_margin(Margin.Top, 2);
    style.set_default_margin(Margin.Right, 2);
    return style;
})();

export default class Theme {
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
     * @returns {number}
     */
    get_constant(name, type) {
        return this.constant_map[type][name];
    }
}

const default_theme = new Theme();
