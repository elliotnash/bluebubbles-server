const START_OF_TEXT = 0x02;
const END_OF_TEXT = 0x03;

export default class SocketMessage {
    event: string;

    data: Buffer;

    constructor(event: string, data: Buffer) {
        this.event = event;
        this.data = data;
    }

    static fromBytes(bytes: Buffer): SocketMessage {
        const eventStart = bytes.indexOf(START_OF_TEXT);
        const eventEnd = bytes.indexOf(END_OF_TEXT);
        const event = bytes.subarray(eventStart + 1, eventEnd).toString("ascii");
        const data = bytes.subarray(eventEnd + 1);
        return new SocketMessage(event, data);
    }

    toBytes(): Buffer {
        const eventBuf = Buffer.from(this.event, "ascii");
        const buf = Buffer.alloc(eventBuf.length + this.data.length + 2);
        buf[0] = START_OF_TEXT;
        eventBuf.forEach((byte, i) => {
            buf[1 + i] = byte;
        });
        buf[eventBuf.length + 1] = END_OF_TEXT;
        const offset = eventBuf.length + 2;
        this.data.forEach((byte, i) => {
            buf[offset + i] = byte;
        });
        return buf;
    }
}
