'use strict'

const express = require('express');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT;

let multer = require('multer');
let fs = require('fs');

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


//=====================
app.get('/', (request, response) => {
        response.render('pages/index');
    })
    //====================== CAMERA FUNCTIONALITY ==================
app.get('/', renderHome);

app.get('/pictostart', renderGame);

function renderGame(request, response) {
    response.render('pages/category');
}

function renderHome(request, response) {
    response.render('index');
}

app.post('/upload', upload.single('image'), function(req, res, next) {
    res.render('myupload', { image: req.file.path });
});
app.get('/uploads/fullsize/:file', function(req, res) {
    file = req.params.file;
    var img = fs.readFileSync(__dirname + '/uploads/fullsize/' + file);
    res.writeHead(200, { 'Content-Type': 'image/jpg' });
    res.end(img, 'binary');
});

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });