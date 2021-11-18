import { Server } from "@server/index";
import * as net from "net";
import * as fs from "fs-extra";
import { ChildProcess, spawn } from "child_process";
import { app } from "electron";
import SocketMessage from "./socketMessage";
import SocketQueue from "./socketQueue";

export default class SwiftHelperService {
    sockPath: string;

    server: net.Server;

    helper: net.Socket = null;

    child: ChildProcess;

    queue: SocketQueue = new SocketQueue();

    private startServer() {
        fs.removeSync(this.sockPath);
        this.server = net.createServer(client => {
            Server().log("Swift Helper connected");
            client.on("end", () => {
                this.helper = null;
                Server().log("Swift Helper disconnected");
            });
            client.on("data", data => {
                const msg = SocketMessage.fromBytes(data);
                this.queue.callNext(msg.data);
            });
            this.helper = client;
        });
        this.server.listen(this.sockPath);
    }

    private runSwiftHelper() {
        Server().log("Starting Swift Helper");
        this.child = spawn("swiftHelper/.build/release/swiftHelper", [this.sockPath]);
        this.child.stdout.setEncoding("utf8");
        this.child.stdout.on("data", data => {
            Server().log(`Swift Helper: ${data.toString().trim()}`);
        });
        this.child.stderr.setEncoding("utf8");
        this.child.stderr.on("data", data => {
            Server().log(`Swift Helper error: ${data}`);
        });
        this.child.on("close", code => {
            Server().log("Swift Helper process exited");
            this.runSwiftHelper();
        });
    }

    start() {
        this.sockPath = `${app.getPath("userData")}/swift-helper.sock`;
        // Configure & start the socket server
        Server().log("Starting Private API Helper...", "debug");
        this.startServer();
        setTimeout(this.runSwiftHelper.bind(this), 100);
    }

    async deserializeAttributedBody(blob: Blob): Promise<Record<string, any>> {
        if (this.helper != null) {
            const msg = new SocketMessage("deserializeAttributedBody", Buffer.from(blob));
            this.helper.write(msg.toBytes());
            return new Promise(resolve => {
                this.queue.enqueue(buf => {
                    resolve(buf != null ? JSON.parse(buf.toString()) : null);
                });
            });
        }
        return null;
    }
}
