import Control from "./Control";
import { Vector2, Rectangle } from "engine/math/index";
import { node_class_map } from "engine/registry";
import { SizeFlag } from "./const";

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_rect = new Rectangle();

const Align = {
    LEFT: 0,
    CENTER: 1,
    RIGHT: 2,
    FILL: 3,
}

const VAlign = {
    TOP: 0,
    CENTER: 1,
    BOTTON: 2,
    FILL: 3,
}

const CHAR_NEWLINE = -1;
const CHAR_WRAPLINE = -2;

class WordCache {
    constructor() {
        this.char_pos = 0;
        this.word_len = 0;
        this.pixel_width = 0;
        this.space_count = 0;
        this.next = null;
    }
}

export default class Label extends Control {
    get autowrap() {
        return this._autowrap;
    }
    /**
     * @param {boolean} value
     */
    set autowrap(value) {
        this._autowrap = value;
        this.word_cache_dirty = true;
    }
    /**
     * @param {boolean} value
     * @returns this
     */
    set_autowrap(value) {
        this.autowrap = value;
        return this;
    }

    get uppercase() {
        return this._uppercase;
    }
    /**
     * @param {boolean} value
     */
    set uppercase(value) {
        this._uppercase = value;
        this.word_cache_dirty = true;
    }
    /**
     * @param {boolean} value
     * @returns this
     */
    set_uppercase(value) {
        this.uppercase = value;
        return this;
    }

    get clip_text() {
        return this._clip_text;
    }
    /**
     * @param {boolean} value
     */
    set clip_text(value) {
        this._clip_text = value;
        this.minimum_size_changed();
    }
    /**
     * @param {boolean} value
     * @returns this
     */
    set_clip_text(value) {
        this.clip_text = value;
        return this;
    }

    constructor() {
        super();

        this.type = 'Label';

        this.align = Align.LEFT;
        this._autowrap = false;
        this.line_count = 0;
        this._clip_text = false;
        this.minsize = new Vector2();
        this.lines_skipped = 0;
        this.max_lines_visible = -1;
        this.percent_visible = -1;
        this.text = '';
        this._uppercase = false;
        this.valign = VAlign.TOP;
        this.visible_characters = -1;

        this.word_cache_dirty = false;
        this.word_cache = null;
        this.total_char_cache = 0;

        this.size_flags_vertical = SizeFlag.SHRINK_CENTER;
    }

    _resized() {
        this.word_cache_dirty = true;
    }

    /**
     * @param {Vector2} size
     * @returns {Vector2}
     */
    get_minimum_size(size) {
        const min_style = this.get_stylebox('normal').get_minimum_size(tmp_vec);

        if (this.word_cache_dirty) {
            this.regenerate_word_cache();
        }

        if (this._autowrap) {
            return size.copy(min_style).add(1, this._clip_text ? 1 : this.minsize.y);
        } else {
            size.copy(this.minsize);
            if (this._clip_text) {
                size.x = 1;
            }
            return size.add(min_style);
        }
    }

    /**
     * @returns {number}
     */
    get_line_count() {
        if (!this.is_inside_tree) {
            return 1;
        }
        if (this.word_cache_dirty) {
            this.regenerate_word_cache();
        }

        return this.line_count;
    }
    /**
     * @returns {number}
     */
    get_line_height() {
        return this.get_font('font').get_height();
    }
    /**
     * @returns {number}
     */
    get_total_character_count() { }
    /**
     * @returns {number}
     */
    get_visible_line_count() { }

    regenerate_word_cache() {

    }
}

node_class_map['Label'] = Label;
