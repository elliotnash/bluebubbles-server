//
//  main.swift
//  swiftHelper
//
//  Created by Elliot Nash on 11/16/21.
//
import Foundation

//TODO create logger with different log levels

setbuf(__stdoutp, nil)
if CommandLine.arguments.count > 1 {
    print("starting socket on " + CommandLine.arguments[1])
    SocketManager.shared.connect(sock: CommandLine.arguments[1])
    print("socket closed");
} else {
    print("no sock file provided")
}
