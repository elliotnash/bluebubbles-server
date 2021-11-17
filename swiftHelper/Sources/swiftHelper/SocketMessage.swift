//
//  SocketMessage.swift
//  swiftHelper
//
//  Created by Elliot Nash on 11/16/21.
//

import Foundation

let START_OF_TEXT: UInt8 = 0x02;
let END_OF_TEXT: UInt8 = 0x03;

class SocketMessage {
    let event: String
    let data: Data
    init(event: String, data: Data) {
        self.event = event
        self.data = data
    }
    static func fromBytes(bytes: Data, bytesRead: Int) -> SocketMessage? {
        guard let eventStart = bytes.firstIndex(of: START_OF_TEXT) else {return nil}
        guard let eventEnd = bytes.firstIndex(of: END_OF_TEXT) else {return nil}
        if (bytesRead <= eventEnd+1) {return nil}
        let eventData = bytes.subdata(in: eventStart+1 ..< eventEnd)
        guard let event = String(data: eventData, encoding: .ascii) else {return nil}
        let data = bytes.subdata(in: eventEnd+1 ..< bytesRead)
        return SocketMessage(event: event, data: data)
    }
    func toBytes() -> Data {
        var data = Data([START_OF_TEXT])
        data.append(event.data(using: .ascii)!)
        data.append(Data([END_OF_TEXT]))
        data.append(self.data)
        return data
    }
    func handleMessage() -> SocketMessage? {
        var data: Data? = nil
        if (event == "deserializeAttributedBody") {
            data = deserializeAttributedBody(data: self.data)
        }
        guard let data = data else {return nil}
        return SocketMessage(event: event, data: data)
    }
}
