'use strict'

let username;

const express = require('express');
const pg = require('pg');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT;
let multer = require('multer');
let fs = require('fs');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

//postgres client
const pgclient = new pg.Client(process.env.DATABASE_URL);
pgclient.connect();
// setup error logging
pgclient.on('error', (error) => console.error(error));

const answers = ['dog', 'cat', 'yoga mats', 'water bottle', 'computer', 'phone', 'cup'];
// For now always looking for computers
let randomInt = 4;
// Uncomment for random answers
// let randomInt = Math.floor(Math.random() * answers.length);
let answer = answers[randomInt];

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

console.log(`Go find a ${answer}`)

/////// Google Vision SetUp ///////
// imports client library for google cloud
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
});

//input: needs a url as a string
function googleVisionApi(url){
  let response;
  return client
    .labelDetection(url)
    .then(results => {
      const labels = results[0].labelAnnotations;

      //This will update the regex for each answer;
      let regex = new RegExp(answer, "gi")
      console.log('the regex is',regex);
  
      labels.forEach(label => {
        // If it contains the answer and a score higher than 50% then it is a match
        if(label.description.match(regex) && label.score > .5){
          console.log(`it's a match!`);
          console.log(`the ${label.description} has a ${Math.round(100*label.score)}% match`);
          response = `It's a match!`;

        }else if (response !== `It's a match!`){
          console.log('no match :(');
          console.log(`${label.description} is not a match`);
          response = `Not a match`;
        }
        console.log(response);
      })
      //After the comparison updates the sql score
      if(response === `It's a match!`){
        let sqlQuery = `UPDATE scores SET score = score + 200 WHERE username = $1`;
        pgclient.query(sqlQuery, [username]).then(() => {
          console.log('sql score!');
        });
      }
      
      return response;
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/fullsize')
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
var upload = multer({ storage: storage })

//====================== CAMERA FUNCTIONALITY ==================
app.get('/', renderHome);
function renderHome(request, response) {
  response.render('pages/index');
}

app.post('/pictostart', saveName);
function saveName(req, res) {
  console.log('username is ', req.body.name);
  username = req.body.name;
  pgclient.query('INSERT INTO scores (username, score) VALUES ($1, 0)', [username]).then( () => {
    res.render('pages/category', {item: answer});
  });
}

app.get('/pictostart', renderPictoStart);
function renderPictoStart(req, res){
  res.render('pages/category', {item: answer});
}

app.get('/highscores', renderHighScore); //res.render('pages/highscore')
function renderHighScore(req, res) {
  pgclient.query(`SELECT * FROM scores`).then(sqlResponse => {
    console.log(sqlResponse);
    res.render('pages/highscore', {sqlData: sqlResponse});
  })
}

app.post('/result', upload.single('image'), function(req, res, next) {
  googleVisionApi(req.file.path).then(sucess => {
    res.render('./pages/result', { image: req.file.path, msg: sucess });

  });
});

app.get('/uploads/fullsize/:file', function(req, res) {
  let file = req.params.file;
  var img = fs.readFileSync(__dirname + '/uploads/fullsize/' + file);
  res.writeHead(200, { 'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
  
});

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });
