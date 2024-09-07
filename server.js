const http = require('http');
const WebSocket = require('ws');

// Create an HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running.\n');
});

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

const clients = {};

// Function to broadcast user list to all connected clients
const broadcastUserList = () => {
  const userList = Object.keys(clients);
  const packet = JSON.stringify({ type: 'USERLIST', users: userList });
  Object.values(clients).forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(packet);
    }
  });
};

// Handle WebSocket connection
wss.on('connection', (ws, req) => {
  // Extract user ID and name from query parameters
  const params = new URLSearchParams(req.url.split('?')[1]);
  const userId = params.get('USERID');
  const userName = params.get('USER');

  if (!userId || !userName) {
    ws.close();
    return;
  }

  // Add new client to the clients object
  clients[userId] = ws;
  console.log(`User ${userName} connected with ID ${userId}`);

  // Broadcast the updated user list
  broadcastUserList();

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const msgData = JSON.parse(message);
      const { msg, from, to } = msgData;

      if (clients[to]) {
        // Send message to the intended recipient
        const response = JSON.stringify({ type: 'MSG', msg, from });
        clients[to].send(response);
      } else {
        // Send a message back to the sender if the recipient is not available
        const response = JSON.stringify({ type: 'MSG', msg: 'USER Not Available', from });
        ws.send(response);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`User ${userName} disconnected with ID ${userId}`);
    delete clients[userId];
    broadcastUserList();
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start the HTTP server
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
