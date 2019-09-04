'use strict'

const express = require('express');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT;

let multer = require('multer');
let fs = require('fs');

/////// Google Vision SetUp ///////
// imports client library for google cloud
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  keyFilename: 'visionAPIKey.json'
});

function googleVisionApi(url){
  client
    .labelDetection(url)
    .then(results => {
      const labels = results[0].labelAnnotations;
  
      console.log('Labels:');
      labels.forEach(label => console.log(label.description));
      console.log(results[0].labelAnnotations);
      labels.forEach(label => {
        console.log(`the ${label.description} has a ${label.score}% match`)
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

function renderGame(request, response) {
  response.render('pages/category');
}

function renderHome(request, response) {
  response.render('pages/index');
}

app.post('/result', upload.single('image'), function(req, res, next) {
  res.render('./pages/result', { image: req.file.path });
});

app.get('/uploads/fullsize/:file', function(req, res) {
  let file = req.params.file;
  var img = fs.readFileSync(__dirname + '/uploads/fullsize/' + file);
  res.writeHead(200, { 'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
  googleVisionApi(__dirname + '/uploads/fullsize/' + file);
});

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });
