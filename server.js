'use strict'

const express = require('express');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT;

let multer = require('multer');
let fs = require('fs');

const answers = ['dog', 'cat', 'yoga mats', 'water bottle', 'computer', 'phone', 'cup'];
// For now always looking for computers
let randomInt = 4;

// Uncomment for random answers
// let randomInt = Math.floor(Math.random() * answers.length);
let answer = answers[randomInt];

console.log(`Go find a ${answer}`)

/////// Google Vision SetUp ///////
// imports client library for google cloud
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

//input: needs a url as a string
function googleVisionApi(url){
  client
    .labelDetection(url)
    .then(results => {
      const labels = results[0].labelAnnotations;

      //This will update the regex for each answer;
      let regex = new RegExp(answer, "gi")
      console.log('the regex is',regex);
  
      // Debugging Stuff
      // labels.forEach(label => console.log(label.description));
      // console.log(results[0].labelAnnotations);

      labels.forEach(label => {
        // If it contains the answer and a score higher than 50% then it is a match
        if(label.description.match(regex) && label.score > .5){
          console.log(`it's a match!`);
          console.log(`the ${label.description} has a ${Math.round(100*label.score)}% match`);

          //send to happy place
          app.post('/result', upload.single('image'), function(req, res, next) {
            res.render('./pages/result', { image: 'https://www.placecage.com/640/360' });
          });

          //There are a couple options; Could redirect to a url, app.render a new file location, or could pass to ejs with a conditional response. 
        }else{
          console.log('no match :(');
          console.log(`${label.description} is not a match`);

          //send to bummer :(
          
        }
      })
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

// googleVisionApi('./uploads/fullsize/1567535089566-image.jpg');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

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

app.get('/pictostart', renderGame);

// sends item to frontend to be rendered
function renderGame(request, response) {
  response.render('pages/category', {item: answer});
}

function renderHome(request, response) {
  response.render('pages/index');
}

// app.post('/result', upload.single('image'), function(req, res, next) {
//   res.render('./pages/result', { image: req.file.path });
// });

app.get('/uploads/fullsize/:file', function(req, res) {
  let file = req.params.file;
  var img = fs.readFileSync(__dirname + '/uploads/fullsize/' + file);
  res.writeHead(200, { 'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
  googleVisionApi(__dirname + '/uploads/fullsize/' + file);
});

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });
