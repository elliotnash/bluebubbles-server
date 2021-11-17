//
//  main.swift
//  swiftHelper
//
//  Created by Elliot Nash on 11/16/21.
//
import Foundation

setbuf(__stdoutp, nil)
print("starting socket")
SocketManager.shared.connect()
print("socket closed")
