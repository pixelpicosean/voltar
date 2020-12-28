import * as v from 'engine/index';

export class Input extends v.Node2D {
    width = 100;
    height = 20;

    el_type = 'text';

    input_elem: HTMLInputElement = null;

    get_value() {
        return this.input_elem.value;
    }

    show() {
        super.show();

        this.redraw();
        this.input_elem.style.display = 'block';
    }
    hide() {
        super.hide();

        this.input_elem.style.display = 'none';
    }
    set_placeholder(content: string) {
        this.input_elem.placeholder = content;
    }
    clear(focus = true) {
        this.input_elem.value = '';
        focus && this.input_elem.focus();
    }
    focus() {
        this.input_elem.focus();
    }
    show_value(value: number) {
        this.input_elem.value = `${value}`;
        this.show();
    }

    redraw() {
        const rect = v.OS.canvas.getBoundingClientRect();
        const game_scale = rect.width / this.get_viewport().size.width;

        this.input_elem.style.left = `${rect.left + this.get_global_position().x * game_scale}px`;
        this.input_elem.style.top = `${rect.top + window.scrollY + this.get_global_position().y * game_scale}px`;
        this.input_elem.style.width = `${(this.width * game_scale) | 0}px`;
        this.input_elem.style.height = `${(this.height * game_scale) | 0}px`;
        this.input_elem.style.fontSize = `${((this.height * 0.8) * game_scale) | 0}px`;
    }

    _load_data(data: any) {
        super._load_data(data);

        if (data.width !== undefined) this.width = data.width;
        if (data.height !== undefined) this.height = data.height;
        if (data.el_type !== undefined) this.el_type = data.el_type;

        return this;
    }

    _enter_tree() {
        this.input_elem = document.createElement('input');
        document.body.appendChild(this.input_elem);

        this.input_elem.name = this.get_name();
        this.input_elem.type = this.el_type;
        this.input_elem.className = 'scene_input';
        this.input_elem.style.display = 'block';
    }
    _exit_tree() {
        document.body.removeChild(this.input_elem);
    }
    _ready() {
        if (this.visible) {
            this.show()
        }
        this.set_process(true);
    }

    _process(_delta: number) {
        if (this.is_visible_in_tree()) {
            this.redraw();
            this.input_elem.style.display = 'block';
        } else {
            this.input_elem.style.display = 'none';
        }
    }
}

v.attach_script("res://scene/ui/input.tscn", Input);
