/**
 * @type {Message[]}
 */
const pool = [];

class Message {
    constructor() {
        this.obj = null;
        this.method = '';
        this.args = null;
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
     * @param {any} args
     */
    push_call(obj, method, args) {
        // Multiple equal message call is not allowed in a single frame
        for (const m of this.messages) {
            if (m.obj === obj && m.method === method && m.args === args) {
                return;
            }
        }

        let msg = pool.pop();
        if (!msg) msg = new Message();

        msg.obj = obj;
        msg.method = method;
        msg.args = args;

        this.messages.push(msg);
    }
    flush() {
        for (const msg of this.messages) {
            msg.obj[msg.method](msg.args);
            pool.push(msg);
        }

        this.messages.length = 0;
    }
}
let message_queue = new MessageQueue();
