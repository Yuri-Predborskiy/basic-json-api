require('dotenv').config();
const express = require('express');
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

// app.get('/', (req, res) => {
//     console.log('request to root');
//     return res.json({data: 'hello world!'});
// });

// get all albums
app.get('/albums', (req, res) => {
    const albums = Album.find({})
        .then(data => {
            res.json({data});
        })
        .catch(err => {  // template for errors
            console.error(err);
            res.status(500).json({err});
        });
});

// get album by ID
app.get('/albums/:id', (req, res) => {
    Album.findById(req.params.id)
        .then(data => {
            res.json({data});
        })
        .catch(err => {  // template for errors
            console.error(err);
            res.status(500).json({err});
        });
});

// create a new album
app.post('/albums', (req, res) => {
    const album = new Album(req.body);
    album.save()
        .then(data => {
            res.json({data});
        })
        .catch(err => {  // template for errors
            console.error(err);
            res.status(500).json({err});
        });
});

// update album by id, replace all fields with those from request
// note: put means replace all fields, if not present, fields will be deleted
app.put('/albums/:id', (req, res) => {
    // req.body should exist
    Album.findByIdAndUpdate(req.params.id, req.body, {new: true})
        .then(data => {
            res.json({data});
        })
        .catch(err => {  // template for errors
            console.error(err);
            res.status(500).json({err});
        });
});

// get album by ID
app.delete('/albums/:id', (req, res) => {
    Album.findByIdAndDelete(req.params.id)
        .then(() => {
            res.status(204).send();
        })
        .catch(err => {  // template for errors
            console.error(err);
            res.status(500).json({err});
        });
});

// create a new purchase
app.post('/purchases', (req, res) => {
    if (!req.body.user) {
        return res.status(400).json({err: 'user field is required!'})
    }
    if (!req.body.album) {
        return res.status(400).json({err: 'album field is required!'})
    }
    const purchase = new Purchase(req.body);
    purchase.save()
        .then(data => {
            console.log('saved data is', data);
            Purchase.findById(data._id)
                .populate('album')
                //         .populate({path: 'user'})
                //         .execPopulate()
                .then(data => {
                    console.log('populated data', data);
                    return res.json({data});
                })
                .catch(err => {
                    console.error(err);
                    return res.status(500).json({err});
                });
        })
        .catch(err => {  // template for errors
            console.error(err);
            return res.status(500).json({err});
        });
});

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
            serverSelectionTimeoutMS: process.env.MONGODB_TIMEOUT
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