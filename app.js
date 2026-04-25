const http = require("http");
const https = require("https");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { HttpProxyAgent } = require("http-proxy-agent");
const { HttpsProxyAgent } = require("https-proxy-agent");

const PORT = process.env.PORT || 10000;

function checkProxy(proxy) {
  return new Promise((resolve) => {
    let agent;
    let proxyUrl = "";

    if (proxy.includes(":1080") || proxy.includes(":1081") || proxy.includes(":1084") || proxy.includes(":1085") || proxy.includes(":1088")) {
      proxyUrl = `socks5://${proxy}`;
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      proxyUrl = `http://${proxy}`;
      agent = new HttpProxyAgent(proxyUrl);
    }

    const start = Date.now();

    https.get("https://api.ipify.org?format=json", { agent, timeout: 8000 }, (res) => {
      let data = "";

      res.on("data", chunk => data += chunk);

      res.on("end", () => {
        const speed = Date.now() - start;
        try {
          const json = JSON.parse(data);
          resolve({
            proxy,
            status: "working",
            ip: json.ip,
            speed: speed + "ms"
          });
        } catch {
          resolve({
            proxy,
            status: "dead",
            ip: "-",
            speed: "-"
          });
        }
      });

    }).on("error", () => {
      resolve({
        proxy,
        status: "dead",
        ip: "-",
        speed: "-"
      });
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
<!DOCTYPE html>
<html>
<head>
<title>Real Proxy Checker</title>
<style>
body{background:#111;color:#fff;font-family:Arial;text-align:center}
textarea{width:80%;height:150px}
button{padding:10px 20px;background:green;color:white;border:none}
table{width:90%;margin:auto;border-collapse:collapse}
td,th{border:1px solid #333;padding:8px}
</style>
</head>
<body>
<h1>Real Proxy Checker</h1>
<textarea id="proxies"></textarea><br><br>
<button onclick="check()">Check All</button>
<table>
<thead>
<tr><th>Proxy</th><th>Status</th><th>IP</th><th>Speed</th></tr>
</thead>
<tbody id="results"></tbody>
</table>
<script>
async function check(){
 let proxies=document.getElementById("proxies").value.trim().split("\\n");
 document.getElementById("results").innerHTML="";
 for(let p of proxies){
   let r=await fetch("/check?proxy="+encodeURIComponent(p));
   let j=await r.json();
   document.getElementById("results").innerHTML +=
   "<tr><td>"+j.proxy+"</td><td>"+j.status+"</td><td>"+j.ip+"</td><td>"+j.speed+"</td></tr>";
 }
}
</script>
</body>
</html>
`);
  } else if (req.url.startsWith("/check?proxy=")) {
    const proxy = decodeURIComponent(req.url.split("=")[1]);
    const result = await checkProxy(proxy);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
