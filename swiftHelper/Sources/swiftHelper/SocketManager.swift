//
//  SocketManager.swift
//  swiftHelper
//
//  Created by Elliot Nash on 11/16/21.
//

import Foundation
import Socket

class SocketManager {
    static let shared = SocketManager()
    var sock: Socket? = nil
    func connect(sock: String) {
        while true {
            do {
                try self.sock = Socket.create(family: Socket.ProtocolFamily.unix, proto: Socket.SocketProtocol.unix)
                try self.sock?.connect(to: sock)
                print("connected to socket")
                event()
                print("socket disconnected")
            } catch let error {
                guard let socketError = error as? Socket.Error else {
                    print("unexpected error...\n \(error)")
                    return
                }
                print("error reported:\n \(socketError.description)")
            }
            print("attempting reconnect in 5 seconds")
            sleep(5)
        }
    }
    private func event() {
        var readData = Data(capacity: 12288)
        while true {
            do {
                let bytesRead = try sock?.read(into: &readData)
                guard let msg = SocketMessage.fromBytes(bytes: readData, bytesRead: bytesRead!) else {break}
                try sock?.write(from: msg.handleMessage()!.toBytes())
            } catch let error {
                guard let socketError = error as? Socket.Error else {
                    print("Unexpected error by connection at \(sock?.remotePath ?? "null")...")
                    return
                }
                print("Error reported by connection at \(sock?.remotePath ?? "null"):\n \(socketError.description)")
            }
        }
    }
}
