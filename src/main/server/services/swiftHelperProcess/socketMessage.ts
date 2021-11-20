import { generateUuid } from "@server/helpers/utils";

const START_OF_TEXT = 0x02;
const END_OF_TEXT = 0x03;

export default class SocketMessage {
    event: string;

    data: Buffer;

    uuid: string;

    constructor(event: string, data: Buffer, uuid?: string) {
        this.event = event;
        this.data = data;
        this.uuid = uuid ?? generateUuid();
    }

    static fromBytes(bytes: Buffer): SocketMessage {
        const eventStart = bytes.indexOf(START_OF_TEXT);
        const eventEnd = bytes.indexOf(END_OF_TEXT);
        const event = bytes.subarray(eventStart + 1, eventEnd).toString("ascii");
        const remain = bytes.subarray(eventEnd + 1);
        const uuidStart = remain.indexOf(START_OF_TEXT);
        const uuidEnd = remain.indexOf(END_OF_TEXT);
        const uuid = remain.subarray(uuidStart + 1, uuidEnd).toString("ascii");
        const data = remain.subarray(uuidEnd + 1);
        return new SocketMessage(event, data, uuid);
    }

    toBytes(): Buffer {
        const eventBuf = Buffer.from(this.event, "ascii");
        const uuidBuf = Buffer.from(this.uuid, "ascii");
        const buf = Buffer.alloc(eventBuf.length + 2 + uuidBuf.length + 2 + this.data.length);
        let loc = 0;
        buf[loc] = START_OF_TEXT;
        eventBuf.copy(buf, (loc += 1));
        buf[(loc += eventBuf.length)] = END_OF_TEXT;
        buf[(loc += 1)] = START_OF_TEXT;
        uuidBuf.copy(buf, (loc += 1));
        buf[(loc += uuidBuf.length)] = END_OF_TEXT;
        this.data.copy(buf, (loc += 1));
        return buf;
    }
}
