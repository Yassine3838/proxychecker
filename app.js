const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 10000;

function fetchGeo(ip) {
  return new Promise((resolve) => {
    https.get(`https://ipapi.co/${ip}/json/`, (resp) => {
      let data = "";
      resp.on("data", chunk => data += chunk);
      resp.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({});
        }
      });
    }).on("error", () => resolve({}));
  });
}

function checkProxy(proxy) {
  return new Promise((resolve) => {
    const start = Date.now();

    const req = http.get("http://api.ipify.org", (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", async () => {
        const speed = Date.now() - start;
        const geo = await fetchGeo(data.trim());

        resolve({
          proxy,
          status: "working",
          ip: data.trim(),
          country: geo.country_name || "Unknown",
          city: geo.city || "Unknown",
          speed: speed + " ms"
        });
      });
    });

    req.on("error", () => {
      resolve({
        proxy,
        status: "dead"
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        proxy,
        status: "timeout"
      });
    });
  });
}

const html = `
<!DOCTYPE html>
<html>
<head>
<title>Advanced Proxy Checker</title>
<style>
body{background:#111;color:#fff;font-family:Arial;text-align:center;padding:20px}
input{padding:10px;width:300px}
button{padding:10px;background:green;color:#fff;border:none}
#result{margin-top:20px;white-space:pre-wrap}
</style>
</head>
<body>
<h1>Advanced Proxy Checker</h1>
<input id="proxy" placeholder="IP:PORT">
<button onclick="check()">Check</button>
<div id="result"></div>
<script>
async function check(){
let proxy=document.getElementById('proxy').value;
let res=await fetch('/check?proxy='+proxy);
let data=await res.json();
document.getElementById('result').innerText=JSON.stringify(data,null,2);
}
</script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === "/check") {
    const proxy = parsed.query.proxy;
    const result = await checkProxy(proxy);
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify(result));
  } else {
    res.writeHead(200, {"Content-Type":"text/html"});
    res.end(html);
  }
});

server.listen(PORT, "0.0.0.0");
