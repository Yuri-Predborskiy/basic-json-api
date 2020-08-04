require('dotenv').config();
const express = require('express');
require('express-async-errors');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    password: String
});
const User = mongoose.model('User', userSchema);

const albumSchema = mongoose.Schema({
    title: String,
    performer: String,
    cost: Number
});
const Album = mongoose.model('Album', albumSchema);

const purchaseSchema = mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    album: {type: mongoose.Schema.Types.ObjectId, ref: 'Album'}
});
const Purchase = mongoose.model('Purchase', purchaseSchema);

app.use(bodyParser.json());
const loggedInUserSet = new Set();

// get all albums
app.get('/albums', async (req, res) => {
    const albums = await Album.find({});
    return res.json({data: albums});
});

// get album by ID
app.get('/albums/:id', async (req, res) => {
    const album = await Album.findById(req.params.id);
    return res.json({data: album});
});

// create a new album
app.post('/albums', async (req, res) => {
    const album = new Album(req.body);
    const albumRecord = await album.save();
    return res.json({data: albumRecord});
});

// update album by id, replace all fields with those from request, fields not present will be set to null
app.put('/albums/:id', async (req, res) => {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, {new: true});
    return res.json({data: album});
});

// get album by ID
app.delete('/albums/:id', async (req, res) => {
    await Album.findByIdAndDelete(req.params.id);
    return res.status(204).end();
});

// create a new purchase
app.post('/purchases', async (req, res) => {
    // validate request
    const purchase = new Purchase(req.body);
    const purchaseRecord = await purchase.save();
    const purchasePopulated = await Purchase
        .findById(purchaseRecord._id)
        .populate('album')
        .populate('user')
    ;
    return res.json({data: purchasePopulated});
});

// create a user - sign up
app.post('/signup', async (req, res) => {
    const user = new User(req.body);
    await user.save();
    res.set('authorization', generateAuthorizationString());
    return res.status(201).end();
});

app.post('/login', async (req, res) => {
    const userRecord = await User.find({email: req.body.email, password: req.body.password});
    if (!userRecord[0]) {
        return res.status(401).end();
    }
    res.set('authorization', generateAuthorizationString());
    return res.status(204).end();
});


app.post('/logout', async (req, res) => {
    const auth = req.headers.authorization;
    // res.removeHeader('authorization'); // header is not added by default
    loggedInUserSet.delete(auth);
    return res.status(204).end();
});

/**
 * Final error handler for express. Also catches and processes unhandled promise rejections
 */
app.use(function (error, req, res, next) {
    console.error(error.stack);
    res.status(500).json({error: error.message});
});

/**
 * A function to create auth string for bearer token. NOT SECURE!
 * @returns {string}
 */
function generateAuthorizationString() {
    // todo: replace with a unique, random token or use 3rd party library to handle tokens, like JWT
    function generateString() {
        return ('Bearer ' + Math.floor(Math.random() * Math.pow(10, 16))).padStart(16, '0');
    }
    let string = generateString();
    while (loggedInUserSet.has(string)) {
        string = generateString();
    }
    loggedInUserSet.add(string);
    return string;
}

/**
 * Middleware to check whether req has a valid authorization token
 * @returns {*}
 */
function authMiddleware(req, res, next) {
    // todo: use 3rd party library for authorization
    // or check authorization header type and value
    const authHeader = req.headers.authorization;
    // note: REST requires not having server-size user session data
    // current solution is made for a very specific requirement
    if (!loggedInUserSet.has(authHeader)) {
        res.status(401).end();
    }
    return next();
}

/**
 * Function that starts express server only after a database connection is established. Handles promise rejections
 * @returns {Promise<void>}
 */
async function start() {
    // handle promise rejection in case we can't connect to database
    await mongoose.connect(
        process.env.MONGODB_URL,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: process.env.MONGODB_TIMEOUT,
            useFindAndModify: false
        })
        .then(() => {
            console.log('Database connected!');
        })
        .catch((error) => {
            console.error('Error on start: ' + error.stack);
            process.exit(1);
        })
    ;

    // database connection established - start server
    app.listen(process.env.PORT, () => {
        console.log(`App listening at http://localhost:${process.env.PORT}`)
    });
}

start().then();

module.exports = app;