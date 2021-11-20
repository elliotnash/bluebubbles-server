import { Server } from "@server/index";
import * as net from "net";
import * as fs from "fs-extra";
import { ChildProcess, spawn } from "child_process";
import { app } from "electron";
import { FileSystem } from "@server/fileSystem";
import SocketMessage from "./socketMessage";
import SocketQueue from "./socketQueue";

export default class SwiftHelperService {
    sockPath: string;

    helperPath: string;

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
                this.queue.call(msg.uuid, msg.data);
            });
            this.helper = client;
        });
        this.server.listen(this.sockPath);
    }

    private runSwiftHelper() {
        Server().log("Starting Swift Helper");
        this.child = spawn(this.helperPath, [this.sockPath]);
        this.child.stdout.setEncoding("utf8");
        this.child.stdout.on("data", data => {
            Server().log(`Swift Helper: ${data.toString().trim()}`, "debug");
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
        this.helperPath = `${FileSystem.resources}/swiftHelper`;
        this.sockPath = `${app.getPath("userData")}/swift-helper.sock`;
        // Configure & start the socket server
        Server().log("Starting Swift Helper...", "debug");
        this.startServer();
        setTimeout(this.runSwiftHelper.bind(this), 100);
    }

    private async sendSocketMessage(msg: SocketMessage): Promise<Buffer | null> {
        return new Promise(resolve => {
            this.helper.write(msg.toBytes());
            this.queue.enqueue(msg.uuid, resolve);
        });
    }

    async deserializeAttributedBody(blob: Blob | null): Promise<Record<string, any>> {
        if (blob != null && this.helper != null) {
            const msg = new SocketMessage("deserializeAttributedBody", Buffer.from(blob));
            const buf = await this.sendSocketMessage(msg);
            if (buf != null) {
                try {
                    return JSON.parse(buf.toString());
                } catch (e) {
                    Server().log(e);
                }
            }
        }
        return null;
    }
}
