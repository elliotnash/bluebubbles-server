import { Server } from "@server/index";
import * as net from "net"
import * as fs from "fs-extra"
import { ChildProcess, spawn } from "child_process";
import SocketMessage from "./socketMessage";

export class SwiftHelperService {

  server: net.Server;

  helper: net.Socket;

  child: ChildProcess;

  startServer() {
    fs.removeSync("testsock.sock");
    this.server = net.createServer((client) => {
      Server().log("Swift Helper connected");
      client.on('end', () => {
        Server().log("Swift Helper disconnected");
      });
      client.on('data', (data) => {
        const msg = SocketMessage.fromBytes(data);
      })
      this.helper = client;
    });
    this.server.listen('testsock.sock');
  }

  runSwiftHelper() {
    Server().log("Starting Swift Helper");
    this.child = spawn('swiftHelper/.build/release/swiftHelper');
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (data) => {
      Server().log(`Swift Helper: ${data.toString().trim()}`);
    });
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (data) => {
      console.log(`Swift Helper error: ${data}`);
    });
    this.child.on('close', (code) => {
      this.runSwiftHelper();
    });
  }

  start() {
    // Configure & start the socket server
    Server().log("Starting Private API Helper...", "debug");
    this.startServer();
    setTimeout(this.runSwiftHelper, 100);
  }
}
