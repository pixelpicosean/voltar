/** @type {Message[]} */
const Message_Pool = [];

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
     * @param {any} [args]
     */
    push_call(obj, method, ...args) {
        let msg = Message_Pool.pop();
        if (!msg) msg = new Message();

        msg.obj = obj;
        msg.method = method;
        msg.args = [...args];

        this.messages.push(msg);
    }
    flush() {
        for (const msg of this.messages) {
            msg.obj[msg.method](...msg.args);
            Message_Pool.push(msg);
        }

        this.messages.length = 0;
    }
}
const message_queue = new MessageQueue();
