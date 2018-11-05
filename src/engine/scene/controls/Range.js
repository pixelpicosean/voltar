import Control from "./Control";
import { Vector2, Rectangle, clamp } from "engine/math/index";
import { remove_items } from "engine/dep/index";

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_rect = new Rectangle();

class Shared {
    /**
     * @param {Range} [owner]
     */
    constructor(owner) {
        this.val = 0;
        this.min = 0;
        this.max = 100;

        this.step = 1;
        this.page = 0;

        this.exp_ratio = false;
        this.allow_greater = false;
        this.allow_lesser = false;

        this.owners = [];
        if (owner !== undefined) {
            this.owners.push(owner);
        }
    }
    emit_value_changed() {
        for (let e of this.owners) {
            if (!e.is_inside_tree) {
                continue;
            }
            e._value_changed_notify();
        }
    }
    emit_changed(what) {
        for (let e of this.owners) {
            if (!e.is_inside_tree) {
                continue;
            }
            e._changed_notify(what);
        }
    }
}

export default class Range extends Control {
    get allow_greater() {
        return this.shared.allow_greater;
    }
    set allow_greater(val) {
        this.shared.allow_greater = val;
    }
    /**
     * @param {boolean} val
     * @returns {this}
     */
    set_allow_greater(val) {
        this.allow_greater = val;
        return this;
    }

    get allow_lesser() {
        return this.shared.allow_lesser;
    }
    set allow_lesser(val) {
        this.shared.allow_lesser = val;
    }
    /**
     * @param {boolean} val
     * @returns {this}
     */
    set_allow_lesser(val) {
        this.allow_lesser = val;
        return this;
    }

    get exp_edit() {
        return this.shared.exp_ratio;
    }
    set exp_edit(val) {
        this.shared.exp_ratio = val;
    }
    /**
     * @param {boolean} val
     * @returns {this}
     */
    set_exp_edit(val) {
        this.exp_edit = val;
        return this;
    }

    get value() {
        return this.shared.val;
    }
    set value(val) {
        if (this.shared.step > 0) {
            val = Math.round(val / this.shared.step) * this.shared.step;
        }

        if (this.rounded) {
            val = Math.round(val);
        }

        if (!this.shared.allow_greater && val > this.shared.max - this.shared.page) {
            val = this.shared.max - this.shared.page;
        }

        if (!this.shared.allow_lesser && val < this.shared.min) {
            val = this.shared.min;
        }

        if (this.shared.val === val) {
            return;
        }

        this.shared.val = val;

        this.shared.emit_value_changed();
    }
    /**
     * @param {number} val
     * @returns {this}
     */
    set_value(val) {
        this.value = val;
        return this;
    }

    get min_value() {
        return this.shared.min;
    }
    set min_value(val) {
        this.shared.min = val;
        this.value = this.shared.val;

        this.shared.emit_changed('min');
    }
    /**
     * @param {number} val
     * @returns {this}
     */
    set_min_value(val) {
        this.min_value = val;
        return this;
    }

    get max_value() {
        return this.shared.max;
    }
    set max_value(val) {
        this.shared.max = val;
        this.value = this.shared.val;

        this.shared.emit_changed('max');
    }
    /**
     * @param {number} val
     * @returns {this}
     */
    set_max_value(val) {
        this.max_value = val;
        return this;
    }

    get step() {
        return this.shared.step;
    }
    set step(val) {
        this.shared.step = val;
        this.shared.emit_changed('step');
    }
    /**
     * @param {number} val
     * @returns {this}
     */
    set_step(val) {
        this.step = val;
        return this;
    }

    get page() {
        return this.shared.page;
    }
    set page(val) {
        this.shared.page = val;
        this.value = this.shared.val;

        this.shared.emit_changed('page');
    }
    /**
     * @param {number} val
     * @returns {this}
     */
    set_page(val) {
        this.page = val;
        return this;
    }

    get ratio() {
        if (this.shared.exp_ratio && this.min_value >= 0) {
            const exp_min = this.min_value === 0 ? 0.0 : Math.log(this.min_value) / Math.log(2);
            const exp_max = Math.log(this.max_value) / Math.log(2);
            const value = clamp(this.value, this.shared.min, this.shared.max);
            const v = Math.log(value) / Math.log(2);

            return (v - exp_min) / (exp_max - exp_min);
        } else {
            const value = clamp(this.value, this.shared.min, this.shared.max);
            return (value - this.min_value) / (this.max_value - this.min_value);
        }
    }
    set ratio(val) {
        let v = 0;

        if (this.shared.exp_ratio && this.min_value >= 0) {
            const exp_min = this.min_value === 0 ? 0.0 : Math.log(this.min_value) / Math.log(2);
            const exp_max = Math.log(this.max_value) / Math.log(2);
            v = Math.pow(2, exp_min + (exp_max - exp_min) * val);
        } else {
            const percent = (this.max_value - this.min_value) * val;
            if (this.step > 0) {
                const steps = Math.round(percent / this.step);
                v = steps * this.step + this.min_value;
            } else {
                v = percent + this.min_value;
            }
        }
        v = clamp(v, this.min_value, this.max_value);
        this.value = v;
    }
    /**
     * @param {number} val
     * @returns {this}
     */
    set_ratio(val) {
        this.ratio = val;
        return this;
    }

    /**
     * @param {boolean} val
     * @returns {this}
     */
    set_rounded(val) {
        this.rounded = val;
        return this;
    }

    constructor() {
        super();

        this.type = 'Range';

        this.shared = new Shared(this);

        this.rounded = false;
    }
    _load_data(data) {
        super._load_data(data);

        if (data.allow_greater !== undefined) {
            this.allow_greater = data.allow_greater;
        }
        if (data.allow_lesser !== undefined) {
            this.allow_lesser = data.allow_lesser;
        }

        if (data.exp_edit !== undefined) {
            this.exp_edit = data.exp_edit;
        }

        if (data.max_value !== undefined) {
            this.max_value = data.max_value;
        }
        if (data.min_value !== undefined) {
            this.min_value = data.min_value;
        }

        if (data.page !== undefined) {
            this.page = data.page;
        }
        if (data.ratio !== undefined) {
            this.ratio = data.ratio;
        }

        if (data.rounded !== undefined) {
            this.rounded = data.rounded;
        }

        if (data.step !== undefined) {
            this.step = data.step;
        }

        if (data.value !== undefined) {
            this.value = data.value;
        }

        return this;
    }

    _value_changed(value) { }

    _value_changed_notify() {
        this._value_changed(this.shared.val);
        this.emit_signal('value_changed', this.shared.val);
    }
    _changed_notify(what) {
        this.emit_signal('changed', this.shared.val);
        this._changed_notify(what);
    }

    /**
     * @param {Range} range
     */
    share(range) {
        range._ref_shared(this.shared);
        range._changed_notify();
        range._value_changed_notify();
    }
    unshare() {
        const nshared = new Shared();
        nshared.min = this.shared.min;
        nshared.max = this.shared.max;
        nshared.val = this.shared.val;
        nshared.step = this.shared.step;
        nshared.page = this.shared.page;
        nshared.allow_greater = this.shared.allow_greater;
        nshared.allow_lesser = this.shared.allow_lesser;
        this._unref_shared();
        this._ref_shared(nshared);
    }

    _ref_shared(shared) {
        if (this.shared && shared === this.shared) {
            return;
        }

        this._unref_shared();
        this.shared = shared;
        if (this.shared.owners.indexOf(this) < 0) {
            this.shared.owners.push(this);
        }
    }
    _unref_shared() {
        if (this.shared) {
            remove_items(this.shared.owners, this.shared.owners.indexOf(this), 1);
            if (this.shared.owners.length === 0) {
                this.shared = null;
            }
        }
    }
}
