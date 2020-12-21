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
    get class() { return "MainLoop" }

    /* public */
    input_event(p_event: any) {
        this._input_event(p_event);
    }
    input_text(p_text: string) { }

    init() {
        this._initialize();
    }
    iteration(p_time: number) {
        this._iteration(p_time);
    }
    idle(p_time: number) {
        this._idle(p_time);
    }
    finish() {
        this._finalize();
    }

    drop_files(p_files: string[]) {
        this._drop_files(p_files);
    }

    /* virtual */
    _initialize() { }
    _finalize() { }
    _iteration(p_time: number) { }
    _idle(p_time: number) { }
    _input_event(p_event: any) { }
    _drop_files(p_files: string[]) { }
}
GDCLASS(MainLoop, VObject)
