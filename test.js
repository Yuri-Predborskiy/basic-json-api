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

const userAuthRecord = {
    email: 'nodejs-is-awesome@gmail.com',
    password: 'iamnotsecure'
};
const userFullRecord = {
    name: 'Developer',
    ...userAuthRecord
};

describe('Test /login /logout /signup routes', function() {
    let authHeader = null;

    describe('POST /login', function() {
        it ('should return status 401 when user does not exist', function(done) {
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
        it ('should create a new User in the database and return auth header', function(done) {
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
        it ('should return auth header after logging in', function(done) {
            chai.request(app)
                .post('/login')
                .send(userAuthRecord)
                .end((err, res) => {
                    expect(res.status).to.equal(204);
                    expect(res.headers.authorization).to.exist;
                    authHeader = res.headers.authorization;
                    done();
                });
        });
    });

    describe('POST /logout', function() {
        it ('should return result without auth header when logging out', function(done) {
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
    let authHeader = null;
    let albumId = null;
    before(() => {
        chai.request(app)
            .post('/login')
            .send(userAuthRecord)
            .end((err, res) => {
                expect(res.status).to.equal(204);
                expect(res.headers.authorization).to.exist;
                authHeader = res.headers.authorization;
            });
    });

    describe('GET /albums', function() {
        it ('should get all Albums in the database', function(done) {
            chai.request(app)
                .get('/albums')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data).to.be.an('array').that.is.empty;
                    done();
                });
        });
    });

    describe('POST /albums', function() {
        it ('should not create a new Album if user is not logged in', function(done) {
            chai.request(app)
                .post('/albums')
                .send({title: 'Appetite for Destruction', performer: 'Guns N\' Roses', cost: 20})
                .end((err, res) => {
                    expect(res.status).to.equal(401);
                    done();
                });
        });

        it ('should create a new Album within the database', function(done) {
            chai.request(app)
                .post('/albums')
                .send({title: 'Appetite for Destruction', performer: 'Guns N\' Roses', cost: 20})
                .set('authorization', authHeader)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Destruction');
                    albumId = res.body.data._id;
                    done();
                });
        });
    });

    describe('GET /albums', function() {
        it ('should get all Albums in the database', function(done) {
            chai.request(app)
                .get('/albums')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data).not.to.be.empty;
                    expect(res.body.data[0].title).to.equal('Appetite for Destruction');
                    done();
                });
        });
    });

    describe('GET /albums/:id', function() {
        it ('should get album by id that was assigned when we created album earlier', function(done) {
            chai.request(app)
                .get(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Destruction');
                    done();
                });
        });
    });

    describe('PUT /albums/:id', function() {
        it ('should not update album if user is not authorized', function(done) {
            chai.request(app)
                .put(`/albums/${albumId}`)
                .send({title: 'Appetite for Desserts', performer: 'Guns N\' Puddings', cost: 20})
                .end((err, res) => {
                    expect(res.status).to.equal(401);
                    done();
                });
        });

        it ('should update album that was created earlier', function(done) {
            chai.request(app)
                .put(`/albums/${albumId}`)
                .set('authorization', authHeader)
                .send({title: 'Appetite for Desserts', performer: 'Guns N\' Puddings', cost: 20})
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Desserts');
                    done();
                });
        });
    });

    describe('GET /albums/:id', function() {
        it ('should return updated album', function(done) {
            chai.request(app)
                .get(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.body.data.title).to.equal('Appetite for Desserts');
                    done();
                });
        });
    });

    describe('DELETE /albums/:id', function() {
        it ('should not delete album if user is not authorized', function(done) {
            chai.request(app)
                .delete(`/albums/${albumId}`)
                .end((err, res) => {
                    expect(res.status).to.equal(401);
                    done();
                });
        });

        it ('should delete album', function(done) {
            chai.request(app)
                .delete(`/albums/${albumId}`)
                .set('authorization', authHeader)
                .end((err, res) => {
                    expect(res.status).to.equal(204);
                    expect(res.body.data).not.to.exist;
                    done();
                });
        });
    });

    describe('GET /albums', function() {
        it ('should get all albums in db (empty array)', function(done) {
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
    let authHeader = null;
    const purchaseData = {
        album: null,
        user: '41224d776a326fb40f000001'// random ID for testing since we don't have a route to get users
    };

    before(async function () {
        const loginRes = await chai.request(app)
            .post('/login')
            .send(userAuthRecord);

        expect(loginRes.status).to.equal(204);
        expect(loginRes.headers.authorization).to.exist;
        authHeader = loginRes.headers.authorization;

        const createAlbumRes = await chai.request(app)
            .post('/albums')
            .set('authorization', authHeader)
            .send({title: 'Buy Me Now', performer: 'Tester', cost: 100});

        expect(createAlbumRes.status).to.equal(200);
        expect(createAlbumRes.body.data.title).to.equal('Buy Me Now');
        purchaseData.album = createAlbumRes.body.data._id
    });

    describe('POST /purchases', function() {
        it ('should not create a new Purchase if user is not logged in', function(done) {
            chai.request(app)
                .post('/purchases')
                .send(purchaseData)
                .end((err, res) => {
                    expect(res.status).to.equal(401);
                    done();
                });
        });

        it ('should create a new Purchase within the database', async () => {
            const res = await chai.request(app)
                .post('/purchases')
                .set('authorization', authHeader)
                .send(purchaseData);

            expect(res.status).to.equal(200);
            expect(res.body.data.album.title).to.equal('Buy Me Now');
        });
    });

    describe('POST /purchases after log out', function() {
        before(() => {
            chai.request(app)
                .post('/logout')
                .set('authorization', authHeader)
                .end((err, res) => {
                    expect(res.status).to.equal(204);
                    expect(res.headers.authorization).not.to.exist;
                });
        });

        it ('should not create a new Purchase if user has logged out', function(done) {
            chai.request(app)
                .post('/purchases')
                .set('authorization', authHeader)
                .send(purchaseData)
                .end((err, res) => {
                    expect(res.status).to.equal(401);
                    done();
                });
        });
    });
});
