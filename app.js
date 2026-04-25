const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 10000;

function fetchGeo(ip) {
  return new Promise((resolve) => {
    https.get(`https://ipapi.co/${ip}/json/`, (resp) => {
      let data = "";
      resp.on("data", c => data += c);
      resp.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({}); }
      });
    }).on("error", () => resolve({}));
  });
}

function checkProxy(proxy) {
  return new Promise(async (resolve) => {
    const start = Date.now();

    const req = http.get("http://api.ipify.org", (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", async () => {
        const speed = Date.now() - start;
        const geo = await fetchGeo(data.trim());

        resolve({
          proxy,
          status: "working",
          ip: data.trim(),
          country: geo.country_name || "Unknown",
          speed: speed + " ms"
        });
      });
    });

    req.on("error", () => resolve({ proxy, status: "dead" }));

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ proxy, status: "timeout" });
    });
  });
}

const html = `
<!DOCTYPE html>
<html>
<head>
<title>Advanced Proxy Checker</title>
<style>
body{background:#111;color:#fff;font-family:Arial;padding:20px;text-align:center}
textarea{width:90%;height:150px;padding:10px}
button{padding:10px 20px;margin:5px;background:green;color:#fff;border:none}
table{width:100%;margin-top:20px;border-collapse:collapse}
th,td{border:1px solid #444;padding:8px}
.green{color:lime}
.red{color:red}
</style>
</head>
<body>
<h1>Advanced Proxy Checker</h1>
<p>ضع بروكسيات كل واحد في سطر</p>
<textarea id="proxies"></textarea><br>
<button onclick="checkAll()">Check All</button>
<button onclick="copyWorking()">Copy Working</button>
<h3 id="count"></h3>
<table id="results">
<tr>
<th>Proxy</th><th>Status</th><th>IP</th><th>Country</th><th>Speed</th>
</tr>
</table>

<script>
let working=[];

async function checkAll(){
working=[];
document.getElementById("results").innerHTML=
"<tr><th>Proxy</th><th>Status</th><th>IP</th><th>Country</th><th>Speed</th></tr>";

let proxies=document.getElementById("proxies").value.split("\\n");

for(let p of proxies){
if(!p.trim()) continue;
let res=await fetch('/check?proxy='+encodeURIComponent(p));
let data=await res.json();

if(data.status==="working") working.push(data.proxy);

let row=\`<tr>
<td>\${data.proxy}</td>
<td class="\${data.status==="working"?"green":"red"}">\${data.status}</td>
<td>\${data.ip||""}</td>
<td>\${data.country||""}</td>
<td>\${data.speed||""}</td>
</tr>\`;

document.getElementById("results").innerHTML += row;
document.getElementById("count").innerText =
"Working: "+working.length+" / "+proxies.length;
}
}

function copyWorking(){
navigator.clipboard.writeText(working.join("\\n"));
alert("Copied!");
}
</script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === "/check") {
    const result = await checkProxy(parsed.query.proxy);
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify(result));
  } else {
    res.writeHead(200, {"Content-Type":"text/html"});
    res.end(html);
  }
});

server.listen(PORT, "0.0.0.0");
