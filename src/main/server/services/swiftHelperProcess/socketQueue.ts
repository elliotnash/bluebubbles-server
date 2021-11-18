export default class SocketQueue {
    private queue: Array<(buf: Buffer) => void> = [];

    enqueue(cb: (buf: Buffer) => void) {
        this.queue.push(cb);
        setTimeout(() => {
            this.queue = this.queue.filter(fn => {
                if (fn === cb) {
                    cb(null);
                    return false;
                }
                return true;
            });
        }, 100);
    }

    callNext(buf: Buffer) {
        this.queue.shift()(buf);
    }
}
