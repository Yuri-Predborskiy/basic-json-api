require('dotenv').config();
const express = require('express');
require('express-async-errors');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: String
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
    const result = await album.save();
    return res.json({data: result});
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

app.use(function (error, req, res, next) {
    console.error(error.stack);
    res.status(500).json({error: error.message});
})

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