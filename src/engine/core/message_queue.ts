import { VObject } from "./v_object";

const TYPE_CALL = 0;
const TYPE_NOTIFICATION = 1;
const TYPE_SET = 2;

const Message_Pool: Message[] = [];

class Message {
    type = TYPE_CALL;
    obj: any = null;
    method = "";
    args: any = null;
    notification = -1;
}

export class MessageQueue {
    static get_singleton() {
        return message_queue;
    }

    messages: Message[] = [];

    constructor() {
        if (!message_queue) message_queue = this;
    }

    push_call(obj: any, method: string, ...args: any) {
        let msg = Message_Pool.pop();
        if (!msg) msg = new Message();

        msg.type = TYPE_CALL;
        msg.obj = obj;
        msg.method = method;
        msg.args = [...args];

        this.messages.push(msg);
    }

    push_notification(obj: VObject, p_notification: number) {
        let msg = Message_Pool.pop();
        if (!msg) msg = new Message();

        msg.type = TYPE_NOTIFICATION;
        msg.obj = obj;
        msg.notification = p_notification;

        this.messages.push(msg);
    }

    flush() {
        for (let msg of this.messages) {
            switch (msg.type) {
                case TYPE_CALL: {
                    msg.obj[msg.method](...msg.args);
                } break;
                case TYPE_NOTIFICATION: {
                    (msg.obj as VObject).notification(msg.notification);
                } break;
            }
            Message_Pool.push(msg);
        }

        this.messages.length = 0;
    }
}

let message_queue: MessageQueue = null;
