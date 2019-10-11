const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const urlExists = require("url-exists");
const app = express();

app.use(express.static("public"));
app.use(bodyParser.json());

// Mongo Schema
mongoose.connect(process.env.MONGO_URI);

const urlSchema = new mongoose.Schema({
  url: {
    type: String, 
    unique: true
  },
  index: {
    type: Number,
    unique: true
  }
});

urlSchema.plugin(uniqueValidator);
const Url = mongoose.model("Url", urlSchema);

// Routes
app.get(("/api/timestamp/:date?"), (req, res) => getTimestamp(req, res));
app.get("/api/whoami", (req, res) => getWhoAmI(req.body,res));

app.get("/api/shorturl/:index", (req, res) => getShortUrl(req, res));
app.post("/api/shorturl/new", (req, res) => postShortUrl(req, res));

app.get("*", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});



// Timestamp API funcs
const getTimestamp = (req, res, dateString = req.params.date) => {
  const date = dateString ? !isNaN(dateString) ? new Date(parseInt(dateString)) : new Date(dateString) : new Date();
  
  if (date && !isNaN(date.valueOf())) res.json({unix: date.getTime(), utc: date.toUTCString()});
  else res.json({error: "Invalid Date"});
}

// Header API funcs
const getWhoAmI =
      (req, res, ipaddress = req.ip, language = req.headers["accept-language"], software = req.headers["user-agent"]) =>
res.json({ipaddress,language,software});


////////////////////////////////////////////////////////////
// URL Shortner API funcs
//
const postShortUrl = (req, res) => {
  createAndSaveUrl(req.body.url, (err, url) => {
    if (err && err._message != "Url validation failed") res.json(err);
    else {
      findUrl({url: scrubUrl(req.body.url)}, (err, url) => {
        res.json({original_url: url.url, short_url: url.index});
      });
    }
  });
};

const getShortUrl = (req, res) => {
  findUrl({index: req.params.index}, (err, url) => {
    res.redirect(url.url);
  });
};


const createAndSaveUrl = function(url, done) {
  Url.countDocuments({}).exec((err, count) => {
    const newUrl = new Url({url: scrubUrl(url), index: count});
    urlExists(newUrl.url, (err, exists) => {
      if (exists) newUrl.save((err,data) => err ? done(err) : done(null, data));
      else done({error: "invalid URL"});
    });
  });
};

const scrubUrl = (url, regex = /(http(s)*:\/\/)*(www([^\.])*\.)*/) => url.match(regex) ? "http://" + url.slice(url.match(regex)[0].length) : url;

const findUrl = function(query, done) {
  Url.findOne(query, (err, url) => err ? done(err) : done(null, url));
}
// End URL Shortener
////////////////////////////////////////////////////////////


// Start server
const listener = app.listen(process.env.PORT, function() {
  console.log("Listening on port " + listener.address().port);
});
