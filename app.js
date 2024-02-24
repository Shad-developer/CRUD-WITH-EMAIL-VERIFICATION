require('dotenv').config();

const express = require('express');
const expressLayout = require('express-ejs-layouts');
const connectDB = require('./config/db');
const Routes = require('./routes/route');
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 4000;

// Connection Database
connectDB();

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());



// templating engine
app.set('view engine', 'ejs');
// app.use(expressLayout);
// app.set('layout', './layouts/main');


// Routes
app.use(Routes);


app.listen(PORT, ()=>{
    console.log(`App Listening on http://localhost:${PORT}`);
})
