const net = require("net");

function testTcp(host, port) {
  console.log(`Connecting to ${host}:${port}...`);
  const socket = new net.Socket();
  socket.setTimeout(5000);
  socket.connect(port, host, () => {
    console.log(`SUCCESS: Connected to ${host}:${port}`);
    socket.destroy();
  });
  socket.on("error", (err) => {
    console.log(`ERROR: ${host}:${port} - ${err.message}`);
  });
  socket.on("timeout", () => {
    console.log(`TIMEOUT: ${host}:${port}`);
    socket.destroy();
  });
}

testTcp("ep-dark-waterfall-bd2ohuan-pooler.c-8.us-east-2.aws.neon.tech", 5432);
testTcp("ep-dark-waterfall-bd2ohuan.c-8.us-east-2.aws.neon.tech", 5432);

