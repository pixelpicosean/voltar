import { VObject, GDCLASS } from "./v_object";

export const NOTIFICATION_WM_MOUSE_ENTER = 1002;
export const NOTIFICATION_WM_MOUSE_EXIT = 1003;
export const NOTIFICATION_WM_FOCUS_IN = 1004;
export const NOTIFICATION_WM_FOCUS_OUT = 1005;
export const NOTIFICATION_WM_QUIT_REQUEST = 1006;
export const NOTIFICATION_WM_GO_BACK_REQUEST = 1007;
export const NOTIFICATION_WM_UNFOCUS_REQUEST = 1008;
export const NOTIFICATION_OS_MEMORY_WARNING = 1009;
export const NOTIFICATION_TRANSLATION_CHANGED = 1010;
export const NOTIFICATION_WM_ABOUT = 1011;
export const NOTIFICATION_CRASH = 1012;
export const NOTIFICATION_OS_IME_UPDATE = 1013;

export class MainLoop extends VObject {
    constructor() {
        super();

        this.class = 'MainLoop';
    }

    /* public */
    input_event(p_event) {
        this._input_event(p_event);
    }
    /**
     * @param {string} p_text
     */
    input_text(p_text) { }

    init() {
        this._initialize();
    }
    /**
     * @param {number} p_time
     */
    iteration(p_time) {
        this._iteration(p_time);
    }
    /**
     * @param {number} p_time
     */
    idle(p_time) {
        this._idle(p_time);
    }
    finish() {
        this._finalize();
    }

    /**
     * @param {string[]} p_files
     */
    drop_files(p_files) {
        this._drop_files(p_files);
    }

    /* virtual */
    _initialize() { }
    _finalize() { }
    /**
     * @param {number} p_time
     */
    _iteration(p_time) { }
    /**
     * @param {number} p_time
     */
    _idle(p_time) { }
    _input_event(p_event) { }
    /**
     * @param {string[]} p_files
     */
    _drop_files(p_files) { }
}
GDCLASS(MainLoop, VObject)
