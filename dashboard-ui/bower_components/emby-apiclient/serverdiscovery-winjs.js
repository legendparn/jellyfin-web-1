﻿define([], function () {
    'use strict';

    function listenerSession(resolve, timeoutMs) {

        var listenerSocket = null;
        var serviceName = "7359";
        var servers = [];
        var timeout;
        var stringToSend = "who is EmbyServer?|emby";

        function closeListenerSocket() {

            if (timeout) {
                clearTimeout(timeout);
            }

            if (listenerSocket !== null) {
                // The call below explicitly closes the socket, freeing the UDP port that it is currently bound to.
                listenerSocket.close();
                listenerSocket = null;
            }
            resolve(servers);
        }

        function startListener(eventObject) {

            listenerSocket = new Windows.Networking.Sockets.DatagramSocket();
            listenerSocket.addEventListener("messagereceived", onMessageReceived);

            // Start listen operation.
            listenerSocket.bindServiceNameAsync("").done(function () {

                //try {
                //    var multicastGroup = '255.255.255.255';
                //    listenerSocket.joinMulticastGroup(new Windows.Networking.HostName(multicastGroup));

                //}
                //catch (exception) {
                //    onError("Error while joining multicast group: " + exception.message);
                //    return;
                //}
                sendMessage(stringToSend);
            }, onError);
        }

        function sendMessage(txt) {

            try {
                var remoteHostname = new Windows.Networking.HostName("255.255.255.255");

                // GetOutputStreamAsync can be called multiple times on a single DatagramSocket instance to obtain
                // IOutputStreams pointing to various different remote endpoints. The remote hostname given to
                // GetOutputStreamAsync can be a unicast, multicast or broadcast address.
                listenerSocket.getOutputStreamAsync(remoteHostname, serviceName).done(function (outputStream) {
                    try {
                        // Send out some multicast or broadcast data. Datagrams generated by the IOutputStream will use
                        // <source host, source port> information obtained from the parent socket (i.e., 'listenSocket' in
                        // this case).
                        var writer = new Windows.Storage.Streams.DataWriter(outputStream);
                        writer.writeString(txt);
                        writer.storeAsync().done(function () {
                            timeout = setTimeout(closeListenerSocket, timeoutMs);
                        }, onError);
                    }
                    catch (exception) {
                        onError("Error sending message: " + exception.message);
                    }
                }, onError);
            }
            catch (exception) {
                onError("Error sending message outer: " + exception.message);
            }
        }

        function onMessageReceived(eventArguments) {
            try {
                // Interpret the incoming datagram's entire contents as a string.
                var stringLength = eventArguments.getDataReader().unconsumedBufferLength;
                var receivedMessage = eventArguments.getDataReader().readString(stringLength);

                if (receivedMessage === stringToSend) {
                    return;
                }

                var server = JSON.parse(receivedMessage);

                var remoteAddress;

                //if (eventArguments && eventArguments.remoteAddress) {
                //    remoteAddress = eventArguments.remoteAddress + ":" + eventArguments.remotePort;
                //}

                //if (remoteAddress) {
                //    server.RemoteAddress = remoteAddress;
                //}

                servers.push(server);

            } catch (exception) {
                onError("Error receiving message: " + exception);
            }
        }

        function onError(reason) {
            //require(['alert'], function (alert) {
            //    alert(reason);
            //});
            closeListenerSocket();
        }

        startListener();
    }

    return {

        findServers: function (timeoutMs) {

            return new Promise(function (resolve, reject) {

                new listenerSession(resolve, timeoutMs);
            });
        }
    };

});