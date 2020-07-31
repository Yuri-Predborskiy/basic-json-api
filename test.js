require('dotenv').config();
const {describe} = require('mocha');
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('./app');

chai.use(chaiHttp);

const mongoose = require('mongoose');
// connect to Mongoose
mongoose.connect(process.env.MONGODB_URL);

describe("server", function() {
    let albumId = null;
    // let userId = 'some id';
    describe("GET /albums", function(){
        it ("should get all Albums in the database", function(done){
            chai.request(app)
                .get('/albums')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data).to.be.an('array').that.is.empty;
                    done();
                });
        });
    });
    describe("POST /albums", function(){
        it ("should create a new Album within the database", function(done){
            chai.request(app)
                .post('/albums')
                .send({title: "Appetite for Destruction", performer: "Guns N\' Roses", cost: 20})
                .end((err, res) => {
                    albumId = res.body.data._id;
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal("Appetite for Destruction");
                    done();
                });
        });
    });
    describe("GET /albums", function(){
        it ("should get all Albums in the database", function(done){
            chai.request(app)
                .get('/albums')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data[0].title).to.equal("Appetite for Destruction");
                    done();
                });
        });
    });
    describe("GET /albums/:id", function(){
        it ("should get album by id that was assigned when we created album earlier", function(done){
            chai.request(app)
                .get(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal("Appetite for Destruction");
                    done();
                });
        });
    });
    describe("PUT /albums/:id", function(){
        it ("should get album by id that was assigned when we created album earlier", function(done){
            chai.request(app)
                .put(`/albums/${albumId}`)
                .send({title: "Appetite for Desserts", performer: "Guns N\' Puddings", cost: 20})
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal("Appetite for Desserts");
                    done();
                });
        });
    });
    describe("GET /albums/:id", function(){
        it ("should return updated album", function(done){
            chai.request(app)
                .get(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal("Appetite for Desserts");
                    done();
                });
        });
    });
    describe("DELETE /albums/:id", function(){
        it ("should delete album", function(done){
            chai.request(app)
                .delete(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(204);
                    expect(res.body.data).not.to.exist;
                    done();
                });
        });
    });

    describe("POST /purchases", function(){
        it ("should create a new Purchase within the database", function(done){
            chai.request(app)
                .post('/purchases')
                .send({album: albumId, user: '41224d776a326fb40f000001'})
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal("Appetite for Destruction");
                    done();
                });
        });
    });
});