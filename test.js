require('dotenv').config();
const {describe} = require('mocha');
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('./app');

chai.use(chaiHttp);

const mongoose = require('mongoose');
// connect to Mongoose

before('startup', async () => {
    await mongoose.connect(process.env.MONGODB_URL_TEST, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: process.env.MONGODB_TIMEOUT_TEST,
        useFindAndModify: false
    });
    await mongoose.connection.db.dropDatabase();
});

let albumId = null;
let authHeader = null;

describe('Test /login /logout /signup routes', function() {
    const userAuthRecord = {
        email: 'nodejs-is-awesome@gmail.com',
        password: 'iamnotsecure'
    };
    const userFullRecord = {
        name: 'Developer',
        ...userAuthRecord
    };

    describe('POST /login', function() {
        it ('should return status 401 when user does not exist', function(done){
            chai.request(app)
                .post('/login')
                .send(userAuthRecord)
                .end((err, res) => {
                    expect(res.status).to.equal(401);
                    expect(res.headers.authorization).not.to.exist;
                    done();
                });
        });
    });

    describe('POST /signup', function() {
        it ('should create a new User in the database and return auth header', function(done){
            chai.request(app)
                .post('/signup')
                .send(userFullRecord)
                .end((err, res) => {
                    expect(res.status).to.equal(201);
                    expect(res.headers.authorization).to.exist;
                    done();
                });
        });
    });

    describe('POST /login', function() {
        it ('should return auth header after logging in', function(done){
            chai.request(app)
                .post('/login')
                .send(userAuthRecord)
                .end((err, res) => {
                    authHeader = res.headers.authorization;
                    expect(res.status).to.equal(204);
                    expect(authHeader).to.exist;
                    done();
                });
        });
    });

    describe('POST /logout', function() {
        it ('should return result without auth header when logging out', function(done){
            chai.request(app)
                .post('/logout')
                .set('authorization', authHeader)
                .send(userAuthRecord)
                .end((err, res) => {
                    expect(res.status).to.equal(204);
                    expect(res.headers.authorization).not.to.exist;
                    done();
                });
        });
    })
});

describe('Test /albums routes', function() {
    describe('GET /albums', function() {
        it ('should get all Albums in the database', function(done){
            chai.request(app)
                .get('/albums')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data).to.be.an('array').that.is.empty;
                    done();
                });
        });
    });

    describe('POST /albums', function(){
        it ('should create a new Album within the database', function(done){
            chai.request(app)
                .post('/albums')
                .send({title: 'Appetite for Destruction', performer: 'Guns N\' Roses', cost: 20})
                .end((err, res) => {
                    albumId = res.body.data._id;
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Destruction');
                    done();
                });
        });
    });

    describe('GET /albums', function(){
        it ('should get all Albums in the database', function(done){
            chai.request(app)
                .get('/albums')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data[0].title).to.equal('Appetite for Destruction');
                    done();
                });
        });
    });

    describe('GET /albums/:id', function(){
        it ('should get album by id that was assigned when we created album earlier', function(done){
            chai.request(app)
                .get(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Destruction');
                    done();
                });
        });
    });

    describe('PUT /albums/:id', function(){
        it ('should get album by id that was assigned when we created album earlier', function(done){
            chai.request(app)
                .put(`/albums/${albumId}`)
                .send({title: 'Appetite for Desserts', performer: 'Guns N\' Puddings', cost: 20})
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Desserts');
                    done();
                });
        });
    });

    describe('GET /albums/:id', function(){
        it ('should return updated album', function(done){
            chai.request(app)
                .get(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Desserts');
                    done();
                });
        });
    });

    describe('DELETE /albums/:id', function(){
        it ('should delete album', function(done){
            chai.request(app)
                .delete(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(204);
                    expect(res.body.data).not.to.exist;
                    done();
                });
        });
    });

    describe('GET /albums', function() {
        it ('should get all albums in db (empty array)', function(done){
            chai.request(app)
                .get('/albums')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data).to.be.an('array').that.is.empty;
                    done();
                });
        });
    });

});

describe('Test /purchases routes', function() {
    before(function () {
        return new Promise((resolve) => {
            chai.request(app)
                .post('/albums')
                .send({title: 'Appetite for Destruction', performer: 'Guns N\' Roses', cost: 20})
                .end((err, res) => {
                    albumId = res.body.data._id;
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Destruction');
                    resolve();
                });
        });
    });

    describe('POST /purchases', function() {
        it ('should create a new Purchase within the database', function(done){
            chai.request(app)
                .post('/purchases')
                .send({album: albumId, user: '41224d776a326fb40f000001'})
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.album.title).to.equal('Appetite for Destruction');
                    done();
                });
        });
    });
});
