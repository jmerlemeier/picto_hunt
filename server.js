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
    response.send('Hello Venus.')
})

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });