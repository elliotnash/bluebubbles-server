//
//  main.swift
//  swiftHelper
//
//  Created by Elliot Nash on 11/16/21.
//
import Foundation

setbuf(__stdoutp, nil)
if CommandLine.arguments.count > 1 {
    print("starting socket")
    SocketManager.shared.connect(sock: CommandLine.arguments[1])
    print("socket closed")
} else {
    print("no sock file provided")
}
