const express = require("express");
const app = express();

app.use(express.static("public"));
app.get(("/api/timestamp/:date?"), (req,res) => getTheTime(req, res, req.params.dateString));
app.get("*", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

const getTheTime = (req, res, dateString) => {
  const date = dateString ? !isNaN(dateString) ? new Date(parseInt(dateString)) : new Date(dateString) : new Date();
  
  if (date && !isNaN(date.valueOf())) res.json({unix: date.getTime(), utc: date.toUTCString()});
  else res.json({error: "Invalid Date"});
}

const listener = app.listen(process.env.PORT, function() {
  console.log("Listening on port " + listener.address().port);
});
