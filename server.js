onst express = require("express");
const app = express();

app.use(express.static("public"));
app.get(("/api/timestamp/:date?"), (req, res) => getTimestamp(req, res));
app.get("/api/whoami", (req, res) => getWhoAmI(req,res));

app.get("*", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});


const getTimestamp = (req, res, dateString = req.params.date) => {
  const date = dateString ? !isNaN(dateString) ? new Date(parseInt(dateString)) : new Date(dateString) : new Date();
  
  if (date && !isNaN(date.valueOf())) res.json({unix: date.getTime(), utc: date.toUTCString()});
  else res.json({error: "Invalid Date"});
}

const getWhoAmI =
      (req, res, ipaddress = req.ip, language = req.headers["accept-language"], software = req.headers["user-agent"]) =>
res.json({ipaddress,language,software});


const listener = app.listen(process.env.PORT, function() {
  console.log("Listening on port " + listener.address().port);
});

