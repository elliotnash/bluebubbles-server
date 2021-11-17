import { Server } from "@server/index";
import * as net from "net";
import * as fs from "fs-extra";
import { ChildProcess, spawn } from "child_process";
import { app } from "electron";
import SocketMessage from "./socketMessage";

export class SwiftHelperService {
    sockPath: string;

    server: net.Server;

    helper: net.Socket;

    child: ChildProcess;

    startServer() {
        fs.removeSync(this.sockPath);
        this.server = net.createServer(client => {
            Server().log("Swift Helper connected");
            client.on("end", () => {
                Server().log("Swift Helper disconnected");
            });
            client.on("data", data => {
                const msg = SocketMessage.fromBytes(data);
            });
            this.helper = client;
        });
        this.server.listen(this.sockPath);
    }

    runSwiftHelper() {
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
        setTimeout(this.runSwiftHelper, 100);
    }
}
