const webSocketsServerPort = 8000;
const WebSocketServer = require('websocket').server;
const http = require('http');

// Spinning up the HTTP server and the WebSocket server.
const server = http.createServer();
server.listen(webSocketsServerPort);

const wsServer = new WebSocketServer({
  httpServer: server
});

// Maintains all active connections in this object
const clients = {};

// Function to remove an item from an array
const remove = (arr, key) => {
  return arr.filter(e => e !== key);
};

wsServer.on('request', function(request) {
  const userID = request.resourceURL.query.USERID;
  console.log('Received a new connection from ' + userID);

  // Accept connection
  const connection = request.accept(null, request.origin);
  clients[userID] = connection;

  // Send active user list
  const sendUserList = () => {
    const clientArr = Object.keys(clients);
    const packet = {
      type: "USERLIST",
      users: remove(clientArr, userID)
    };
    for (const key in clients) {
      if (clients.hasOwnProperty(key)) {
        clients[key].sendUTF(JSON.stringify(packet));
      }
    }
  };

  sendUserList();

  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      console.log('Received Message: ' + message.utf8Data);
      try {
        const { userid, msg, to } = JSON.parse(message.utf8Data);
        const packet = {
          type: "MSG",
          msg: `USER Not Available`
        };
        if (clients[to]) {
          packet.msg = msg;
          clients[to].sendUTF(JSON.stringify(packet));
        } else if (clients[userid]) {
          clients[userid].sendUTF(JSON.stringify(packet));
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    } else if (message.type === 'binary') {
      console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
      connection.sendBytes(message.binaryData);
    }
  });

  connection.on('close', function(reasonCode, description) {
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.' + userID);
    // Delete connection
    delete clients[userID];
    sendUserList();
  });

  console.log('Connected: ' + userID + ' in ' + Object.keys(clients));
});
