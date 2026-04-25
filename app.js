const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 10000;

function checkProxy(proxy, callback) {
  const options = {
    host: "api.ipify.org",
    port: 80,
    path: "/",
    method: "GET",
    headers: {
      Host: "api.ipify.org"
    },
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    callback(true);
  });

  req.on("error", () => callback(false));
  req.on("timeout", () => {
    req.destroy();
    callback(false);
  });

  req.end();
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === "/check") {
    const proxy = parsedUrl.query.proxy;

    if (!proxy) {
      res.writeHead(400);
      return res.end("No proxy provided");
    }

    checkProxy(proxy, (alive) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        proxy,
        status: alive ? "working" : "dead"
      }));
    });

  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <h1>Proxy Checker</h1>
      <p>Use /check?proxy=IP:PORT</p>
    `);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
