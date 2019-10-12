/////////////////////////////////////////////////////////////////////
// Init
const express = require("express");
const bodyParser = require("body-parser");
const urlEncodedParser = bodyParser.urlencoded({extended: false});
const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const urlExists = require("url-exists");
const app = express();

app.use(express.static("public"));
app.use(urlEncodedParser);



/////////////////////////////////////////////////////////////////////
// Mongo Schema
mongoose.connect(process.env.MONGO_URI);

const urlSchema = new mongoose.Schema({
  url: {type: String, unique: true},
  index: {type: Number, unique: true}
});

const athleteSchema = new mongoose.Schema({
  username: {type: String, unique: true},
  exercises: [{type: mongoose.Schema.Types.ObjectId, ref: "Exercise"}]
}); 

const exerciseSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date}
}).pre("save", function(next){
  if (!this.date) this.date = Date.now();
  next();
});

urlSchema.plugin(uniqueValidator);
const Url = mongoose.model("Url", urlSchema);
const Athlete = mongoose.model("Athlete", athleteSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);



/////////////////////////////////////////////////////////////////////
// Express Routes
app.get(("/api/timestamp/:date?"), (req, res) => getTimestamp(req, res));
app.get("/api/whoami", (req, res) => getWhoAmI(req.headers,res));

app.get("/api/shorturl/:index", (req, res) => getShortUrl(req, res));
app.post("/api/shorturl/new", (req, res) => postShortUrl(req, res));

app.get("/api/exercise", (req, res) => res.sendFile(__dirname + "/views/exercise.html"));
app.post("/api/exercise/new-user", (req, res) => postExerciseUser(req, res));
app.post("/api/exercise/add", (req, res) => postExercise(req, res));
app.get("/api/exercise/log", (req, res) => getExercise(req, res));


app.get("*", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});


/////////////////////////////////////////////////////////////////////
// Timestamp API funcs
const getTimestamp = (req, res, dateString = req.params.date) => {
  let date = dateString ? !isNaN(dateString) ? new Date(parseInt(dateString)) : new Date(dateString) : new Date();
  
  if (date && !isNaN(date.valueOf())) res.json({unix: date.getTime(), utc: date.toUTCString()});
  else res.json({error: "Invalid Date"});
}


/////////////////////////////////////////////////////////////////////
// Header API funcs
const getWhoAmI = (req, res, ipaddress = req['x-forwarded-for'].split(",")[0], language = req["accept-language"], software = req["user-agent"]) =>
  res.json({ipaddress,language,software});


/////////////////////////////////////////////////////////////////////
// URL Shortner API funcs
const postShortUrl = (req, res) => {
  createAndSaveUrl(req.body.url, (err, url) => {
    if (err && err._message != "Url validation failed") res.json(err);
    else {
      findUrl({url: scrubUrl(req.body.url)}, (err, url) => {
        res.json({original_url: url.url, short_url: url.index});
      });
    }
  });
}

const getShortUrl = (req, res) => {
  findUrl({index: req.params.index}, (err, url) => {
    res.redirect(url.url);
  });
}

const createAndSaveUrl = (url, done) => {
  Url.countDocuments({}).exec((err, count) => {
    let newUrl = new Url({url: scrubUrl(url), index: count});
    urlExists(newUrl.url, (err, exists) => {
      if (exists) newUrl.save((err,data) => err ? done(err) : done(null, data));
      else done({error: "invalid URL"});
    });
  });
}

const scrubUrl = (url, regex = /(http(s)*:\/\/)*(www([^\.])*\.)*/) => url.match(regex) ? "http://" + url.slice(url.match(regex)[0].length) : url;

const findUrl = (query, done) => Url.findOne(query, (err, url) => err ? done(err) : done(null, url));


/////////////////////////////////////////////////////////////////////
// Exercise API funcs
const postExerciseUser = (req, res) => 
  createAndSaveAthlete(req.body.username, (err, athlete) => {
    if (err) res.send(err.code == "11000" ? "User already exists" : "There was an error");
    else res.send("Successfully created new user")
  });

const postExercise = (req, res) => 
  createAndSaveExercise(req.body, (err, exercise) => {
    if (err) res.send(err);
    else res.json(exercise);
  })

const getExercise = (req, res) =>
  findExercises(req.query.username, req.query.from, req.query.to, req.query.limit, (err, data) => {
    res.json(err ? {error: err} : data);
  });

const createAndSaveAthlete = (username, done) => 
  new Athlete({username}).save((err, data) => err ? done(err) : done(null, data));

const createAndSaveExercise = function(exercise, done) {
  let newExercise = new Exercise({...exercise});
  findAthleteAndUpdate(exercise.username, newExercise._id, (err, athlete) => {
    err ? done(err) : !athlete ? done("username not found") : newExercise.save((err, data) => err ? done(err) : done(null, data));
  });
}

const findAthleteAndUpdate = (username, exerciseId, done) =>
  Athlete.findOneAndUpdate({username}, {$push: {exercises: exerciseId}}, (err, athlete) => err ? done(err) : done(null, athlete));

const findExercises = (username, from = 0, to = Date.now(), limit = 0, done) => 
  Athlete.findOne({username}).populate("exercises").exec((err, data) => {
    if (err || !data) done(err ? err : "username not found")
    else {
      let exercises = data.exercises.reverse().filter(exercise => {
        if (exercise.date.getTime() > from && exercise.date.getTime() < to) return exercise
      }).filter((exercise, i) => limit == 0 || i  < limit);
      done(null, exercises)
    }
  });



/////////////////////////////////////////////////////////////////////
// Start server
const listener = app.listen(process.env.PORT, function() {
  console.log("Listening on port " + listener.address().port);
});
