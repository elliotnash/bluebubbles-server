export default class SocketQueue {
    private queue: { [key: string]: (buf: Buffer) => void } = {};

    enqueue(uuid: string, cb: (buf: Buffer) => void) {
        if (!(uuid in this.queue)) {
            this.queue[uuid] = cb;
            setTimeout(() => {
                delete this.queue[uuid];
            }, 100);
        }
    }

    call(uuid: string, buf: Buffer) {
        if (this.queue[uuid] != null) this.queue[uuid](buf);
        delete this.queue[uuid];
    }
}
