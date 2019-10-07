'use strict'

let username;

const express = require('express');
const pg = require('pg');
const app = express();
const aws = require('aws-sdk');
require('dotenv').config();
const PORT = process.env.PORT;
const multer = require('multer');
const multerS3 = require('multer-s3');
const router = express.Router();
let fs = require('fs');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

console.log('hi!');
console.log(process.env.Test);
console.log(`The Test Variable is ${process.env.Test}`);

// const s3 = new aws.S3();
const s3 = new aws.S3({
  accessKeyId: process.env.aws_access_key_id,
  secretAccessKey: process.env.aws_secret_access_key
});

//postgres client
const pgclient = new pg.Client(process.env.DATABASE_URL);
pgclient.connect();
// setup error logging
pgclient.on('error', (error) => console.error(error));

const answers = ['water bottle', 'computer', 'cup', 'fork', 'rubber duckie', 'glasses'];
// For now always looking for computers
//let randomInt = 4;
// Uncomment for random answers

let randomInt;
let answer;
function randomize() {
  randomInt = 1;
  // randomInt = Math.floor(Math.random() * answers.length);
  answer = answers[randomInt];
}
randomize();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

/////// Google Vision SetUp ///////
// imports client library for google cloud
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
});

//input: needs a url as a string
function googleVisionApi(url) {
  let response;
  return client
    .labelDetection(url)
    .then(results => {
      const labels = results[0].labelAnnotations;

      //This will update the regex for each answer;
      let regex = new RegExp(answer, "gi")

      labels.forEach(label => {
        // If it contains the answer and a score higher than 50% then it is a match
        if (label.description.match(regex) && label.score > .5) {
          console.log(`it's a match!`);
          console.log(`the ${label.description} has a ${Math.round(100*label.score)}% match`);
          response = `It's a match!`;

        } else if (response !== `It's a match!`) {
          console.log('no match :(');
          console.log(`${label.description} is not a match`);
          response = `Not a match`;
        }
      })
      //After the comparison updates the sql score
      if (response === `It's a match!`) {
        randomize();
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



//====================== CAMERA FUNCTIONALITY ==================
app.get('/', renderHome);

function renderHome(request, response) {
  response.render('pages/index');
}


app.post('/pictostart', saveName);

function saveName(req, res) {
  username = req.body.name;
  console.log(username);
  pgclient.query('SELECT * FROM scores WHERE username=$1', [username]).then( (sqlResult) => {
    // if we can't find name in database, then we make the name. 
    console.log(sqlResult.rows);
    if(sqlResult.rows.length === 0){
      pgclient.query('INSERT INTO scores (username, score) VALUES ($1, 0)', [username]).then(() => {
        res.render('pages/category', { item: answer });
      });
    } else {
      res.render('pages/category', { item: answer });
    }
  })
}


app.get('/pictostart', renderPictoStart);

function renderPictoStart(req, res) {
  res.render('pages/category', { item: answer });
}


app.get('/highscores', renderHighScore); //res.render('pages/highscore')

function renderHighScore(req, res) {
  pgclient.query(`SELECT * FROM scores`).then(sqlResponse => {
    console.log(sqlResponse.rows);
    res.render('pages/highscore', {sqlData: sqlResponse.rows});
  })
}

// Original result section and multer to local disk

// var storage = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, 'uploads/fullsize')
//   },
//   filename: function(req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname)
//   }
// })
// var upload = multer({ storage: storage })

// app.post('/result', upload.single('image'), function(req, res, next) {
//   googleVisionApi(req.file.path).then(sucess => {
//     pgclient.query(`SELECT score FROM scores WHERE username=$1`, [username]).then(sqlResult => {
//       res.render('./pages/result', { image: req.file.path, msg: sucess, pointsearned: '200', userpoints: sqlResult.rows[0].score});
//     })
//   });
// });

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });

//****************************** AWS LAND ********************** */

//Checks that the file type is jpeg or png
const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type, only jpeg and png allowed.'), false);
  }
}

// from https://www.freecodecamp.org/news/how-to-set-up-simple-image-upload-with-node-and-aws-s3-84e609248792/ and https://github.com/Jerga99/bwm-ng/blob/master/server/services/image-upload.js
const awsUpload = multer({
  fileFilter,
  storage: multerS3({
    acl: 'public-read',
    s3: s3,
    bucket: 'pictohunt',
    metadata: function(req, file, cb) {
      cb(null, {fieldName: 'TESTING_METADATA'});
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})

const singleUpload = awsUpload.single('image');

app.post('/result', awsUpload.single('image'), function(req, res, next) {
  singleUpload(req, res, function(err) {
    console.log('in singleUpload');
    // console.log('the file is',req.file);
    if (err){
      console.log('error in upload :(');
    }
    console.log('req.file.location is',req.file.location);
  })
  googleVisionApi(req.file.location).then(sucess => {
    pgclient.query(`SELECT score FROM scores WHERE username=$1`, [username]).then(sqlResult => {
      res.render('./pages/result', { image: req.file.location, msg: sucess, pointsearned: '200', userpoints: sqlResult.rows[0].score});
    }).catch(err => {
      console.error('ERROR at SQL', err);
    })
  }).catch(err => {
    console.error('ERROR at Google Vision', err);
  });
});

