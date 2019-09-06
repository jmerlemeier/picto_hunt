'use strict'

let username;

const express = require('express');
const pg = require('pg');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT;
let multer = require('multer');
let fs = require('fs');
let cloudinary = require('cloudinary');
const fileUpLoad = require('express-fileupload');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

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
  randomInt = Math.floor(Math.random() * answers.length);
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
  console.log(`google vision api: 49`);
  return client
    .labelDetection(url)
    .then(results => {
      console.log(`google vision api: 53`);
      const labels = results[0].labelAnnotations;

      //This will update the regex for each answer;
      let regex = new RegExp(answer, "gi")
      // console.log('the regex is', regex);

      labels.forEach(label => {
        // If it contains the answer and a score higher than 50% then it is a match
        if (label.description.match(regex) && label.score > .5) {
          // console.log(`it's a match!`);
          // console.log(`the ${label.description} has a ${Math.round(100*label.score)}% match`);
          response = `It's a match!`;

        } else if (response !== `It's a match!`) {
          // console.log('no match :(');
          // console.log(`${label.description} is not a match`);
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

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/fullsize')
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
// var upload = multer({ storage: storage })
var upload = multer({});

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
    res.render('pages/highscore', {sqlData: sqlResponse.rows});
  })
}

var stream = cloudinary.uploader.upload_stream(function(result) { console.log(result); });

// app.get('/result', function(req, res) {
//   res.send('<form method="post" enctype="multipart/form-data">'
//     + '<p>Public ID: <input type="text" name="title"/></p>'
//     + '<p>Image: <input type="file" name="image"/></p>'
//     + '<p><input type="submit" value="Upload"/></p>'
//     + '</form>');
// });

app.post('/result', upload.single('image'),  function(req, res, next) {
  console.log('this is the request file',req.file);
  stream = cloudinary.uploader.upload_stream(function(result) {
    console.log(result);
    res.send('Done:<br/> <img src="' + result.url + '"/><br/>' +
             cloudinary.image(result.public_id, { format: "png", width: 100, height: 130, crop: "fill" }));
  }, { public_id: req.body.title } );
  fs.createReadStream(req.file.buffer.toString('utf8'), {encoding: 'binary'}).on('data', stream.write).on('end', stream.end);
});


app.get('/lol', function(req, res) {
  res.send('<form method="post" enctype="multipart/form-data">'
    + '<p>Public ID: <input type="text" name="title"/></p>'
    + '<p>Image: <input type="file" name="image"/></p>'
    + '<p><input type="submit" value="Upload"/></p>'
    + '</form>');
});
app.use(fileUpLoad({
  useTempFiles: true,
  tempFileDir: './uploads/fullsize/'
}));
app.post('/lol', function(req, res, next) {
  console.log(req.files);
  stream = cloudinary.uploader.upload_stream(function(result) {
    console.log(result);
    res.send('Done:<br/> <img src="' + result.url + '"/><br/>' +
             cloudinary.image(result.public_id, { format: "png", width: 100, height: 130, crop: "fill" }));
  }, { public_id: req.body.title } );

  console.log(cloudinary.url("sample.jpg", { width: 100, height: 150, crop: "fill" }))

  fs.createReadStream(req.files.image.tempFilePath, {encoding: 'binary'}).on('data', stream.write).on('end', stream.end);
});

// app.post('/result', upload.single('image'), function(req, res, next) {
//   console.log(`google vision api: 142 ${req.file.path}`);
//   googleVisionApi(req.file.path).then(sucess => {
//     console.log(`google vision api: 144`);
//     pgclient.query(`SELECT score FROM scores WHERE username=$1`, [username]).then(sqlResult => {
//       console.log(`google vision api: 146`);
//       res.render('./pages/result', { image: req.file.path, msg: sucess, pointsearned: '200', userpoints: sqlResult.rows[0].score});
//     })
//   });
// });


app.get('/uploads/fullsize/:file', function(req, res) {
  let file = req.params.file;
  var img = fs.readFileSync(__dirname + '/uploads/fullsize/' + file);
  res.writeHead(200, { 'Content-Type': 'image/jpg' });
  res.end(img, 'binary');

});

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });
