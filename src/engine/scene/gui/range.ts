import { remove_items } from "engine/dep/index";
import { clamp } from "engine/core/math/math_funcs";

import { Control } from "./control";


class Shared {
    val = 0;
    min = 0;
    max = 100;

    step = 1;
    page = 0;

    exp_ratio = false;
    allow_greater = false;
    allow_lesser = false;

    owners: Range[] = [];

    constructor(owner?: Range) {
        if (owner) {
            this.owners.push(owner);
        }
    }

    emit_value_changed() {
        for (let e of this.owners) {
            if (!e.is_inside_tree()) {
                continue;
            }
            e._value_changed_notify();
        }
    }
    /**
     * @param {string} what
     */
    emit_changed(what: string) {
        for (let e of this.owners) {
            if (!e.is_inside_tree()) {
                continue;
            }
            e._changed_notify(what);
        }
    }
}

export class Range extends Control {
    get allow_greater() { return this.shared.allow_greater }

    get allow_lesser() { return this.shared.allow_lesser }

    get exp_edit() { return this.shared.exp_ratio }

    get value() { return this.shared.val }

    get min_value() { return this.shared.min }

    get max_value() { return this.shared.max }

    get step() { return this.shared.step }

    get page() { return this.shared.page }

    get ratio() {
        if (this.shared.exp_ratio && this.min_value >= 0) {
            const exp_min = this.min_value === 0 ? 0.0 : Math.log(this.min_value) / Math.log(2);
            const exp_max = Math.log(this.max_value) / Math.log(2);
            const value = clamp(this.value, this.shared.min, this.shared.max);
            const v = Math.log(value) / Math.log(2);

            return clamp((v - exp_min) / (exp_max - exp_min), 0, 1);
        } else {
            const value = clamp(this.value, this.shared.min, this.shared.max);
            return clamp((value - this.min_value) / (this.max_value - this.min_value), 0, 1);
        }
    }

    type = 'Range';

    rounded = false;
    shared = new Shared(this);

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.allow_greater !== undefined) {
            this.set_allow_greater(data.allow_greater);
        }
        if (data.allow_lesser !== undefined) {
            this.set_allow_lesser(data.allow_lesser);
        }

        if (data.exp_edit !== undefined) {
            this.set_exp_edit(data.exp_edit);
        }

        if (data.max_value !== undefined) {
            this.set_max_value(data.max_value);
        }
        if (data.min_value !== undefined) {
            this.set_min_value(data.min_value);
        }

        if (data.page !== undefined) {
            this.set_page(data.page);
        }
        if (data.ratio !== undefined) {
            this.set_ratio(data.ratio);
        }

        if (data.rounded !== undefined) {
            this.set_rounded(data.rounded);
        }

        if (data.step !== undefined) {
            this.set_step(data.step);
        }

        if (data.value !== undefined) {
            this.set_value(data.value);
        }

        return this;
    }

    /* public */

    /**
     * @param {boolean} val
     */
    set_allow_greater(val: boolean) {
        this.shared.allow_greater = val;
    }

    /**
     * @param {boolean} val
     */
    set_allow_lesser(val: boolean) {
        this.shared.allow_lesser = val;
    }

    /**
     * @param {boolean} val
     */
    set_exp_edit(val: boolean) {
        this.shared.exp_ratio = val
    }

    /**
     * @param {number} val
     */
    set_value(val: number) {
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
     */
    set_min_value(val: number) {
        this.shared.min = val;
        this.set_value(this.shared.val);

        this.shared.emit_changed('min');
    }

    /**
     * @param {number} val
     */
    set_max_value(val: number) {
        this.shared.max = val;
        this.set_value(this.shared.val);

        this.shared.emit_changed('max');
    }

    /**
     * @param {number} val
     */
    set_step(val: number) {
        this.shared.step = val;
        this.shared.emit_changed('step');
    }

    /**
     * @param {number} val
     */
    set_page(val: number) {
        this.shared.page = val;
        this.set_value(this.shared.val);

        this.shared.emit_changed('page');
    }

    /**
     * @param {number} val
     */
    set_ratio(val: number) {
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
        this.set_value(v);
    }

    /**
     * @param {boolean} val
     */
    set_rounded(val: boolean) {
        this.rounded = val;
        return this;
    }

    /* private */

    /**
     * @param {any} value
     */
    _value_changed(value: any) { }

    _value_changed_notify() {
        this._value_changed(this.shared.val);
        this.emit_signal('value_changed', this.shared.val);
        this.update();
    }

    _changed_notify(what?: string) {
        this.emit_signal('changed', this.shared.val);
    }

    /**
     * @param {Range} range
     */
    share(range: Range) {
        range._ref_shared(this.shared);
        range._changed_notify();
        range._value_changed_notify();
    }
    unshare() {
        const nshared = new Shared;
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

    /**
     * @param {Shared} shared
     */
    _ref_shared(shared: Shared) {
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
