'use strict'

const express = require('express');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT;

app.get('/', (request, response) => {
    response.send('Hello Venus.')
})

app.listen(PORT, () => { console.log(`app is up on port ${PORT}. BYEAH!`) });