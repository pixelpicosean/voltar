import { VObject } from "./v_object";

const TYPE_CALL = 0;
const TYPE_NOTIFICATION = 1;
const TYPE_SET = 2;

/** @type {Message[]} */
const Message_Pool = [];

class Message {
    constructor() {
        this.type = TYPE_CALL;
        this.obj = null;
        this.method = '';
        this.args = null;
        this.notification = -1;
    }
}

export default class MessageQueue {
    static get_singleton() {
        return message_queue;
    }

    constructor() {
        /**
         * Message list
         *
         * @private
         * @type {Message[]}
         */
        this.messages = [];
    }

    /**
     * @param {any} obj
     * @param {string} method
     * @param {any} [args]
     */
    push_call(obj, method, ...args) {
        let msg = Message_Pool.pop();
        if (!msg) msg = new Message();

        msg.type = TYPE_CALL;
        msg.obj = obj;
        msg.method = method;
        msg.args = [...args];

        this.messages.push(msg);
    }

    /**
     * @param {VObject} obj
     * @param {number} p_notification
     */
    push_notification(obj, p_notification) {
        let msg = Message_Pool.pop();
        if (!msg) msg = new Message();

        msg.type = TYPE_NOTIFICATION;
        msg.obj = obj;
        msg.notification = p_notification;

        this.messages.push(msg);
    }

    flush() {
        for (const msg of this.messages) {
            switch (msg.type) {
                case TYPE_CALL: {
                    msg.obj[msg.method](...msg.args);
                } break;
                case TYPE_NOTIFICATION: {
                    /** @type {VObject} */(msg.obj).notification(msg.notification);
                } break;
            }
            Message_Pool.push(msg);
        }

        this.messages.length = 0;
    }
}
const message_queue = new MessageQueue();
