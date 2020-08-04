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

describe('Test /login /logout /signup routes', () =>  {
    let authHeader = null;

    describe('POST /login', () =>  {
        it ('should return status 401 when user does not exist', async () => {
            const res = await chai.request(app)
                .post('/login')
                .send(userAuthRecord);
            expect(res.status).to.equal(401);
            expect(res.headers.authorization).not.to.exist;
        });
    });

    describe('POST /signup', () =>  {
        it ('should create a new User in the database and return auth header', async () => {
            const res = await chai.request(app)
                .post('/signup')
                .send(userFullRecord);
            expect(res.status).to.equal(201);
            expect(res.headers.authorization).to.exist;
        });
    });

    describe('POST /login', () =>  {
        it ('should return auth header after logging in', async () => {
            const res = await chai.request(app)
                .post('/login')
                .send(userAuthRecord);
            expect(res.status).to.equal(204);
            expect(res.headers.authorization).to.exist;
            authHeader = res.headers.authorization;
        });
    });

    describe('POST /logout', () =>  {
        it ('should return result without auth header when logging out', async () => {
            const res = await chai.request(app)
                .post('/logout')
                .set('authorization', authHeader)
                .send(userAuthRecord);
            expect(res.status).to.equal(204);
            expect(res.headers.authorization).not.to.exist;
        });
    })
});

describe('Test /albums routes', () =>  {
    let authHeader = null;
    let albumId = null;

    const albumOriginal = {title: 'Appetite for Desserts', performer: 'Guns N\' Puddings', cost: 20};
    const albumUpdated = {title: 'Appetite for Desserts', performer: 'Guns N\' Puddings', cost: 20};

    before(async () => {
        const res = await chai.request(app)
            .post('/login')
            .send(userAuthRecord);
        expect(res.status).to.equal(204);
        expect(res.headers.authorization).to.exist;
        authHeader = res.headers.authorization;
    });

    describe('GET /albums', () =>  {
        it ('should get all Albums in the database', async () => {
            const res = await chai.request(app)
                .get('/albums');
            expect(res.status).to.equal(200);
            expect(res.body.data).to.be.an('array').that.is.empty;
        });
    });

    describe('POST /albums', () =>  {
        it ('should not create a new Album if user is not logged in', async () => {
            const res = await chai.request(app)
                .post('/albums')
                .send(albumOriginal);
            expect(res.status).to.equal(401);
        });

        it ('should create a new Album within the database', async () => {
            const res = await chai.request(app)
                .post('/albums')
                .send(albumOriginal)
                .set('authorization', authHeader);
            expect(res.status).to.equal(200);
            expect(res.body.data.title).to.equal(albumOriginal.title);
            albumId = res.body.data._id;
        });
    });

    describe('GET /albums', () =>  {
        it ('should get all Albums in the database', async () => {
            const res = await chai.request(app)
                .get('/albums');
            expect(res.status).to.equal(200);
            expect(res.body.data).not.to.be.empty;
            expect(res.body.data[0].title).to.equal(albumOriginal.title);
        });
    });

    describe('GET /albums/:id', () =>  {
        it ('should get album by id that was assigned when we created album earlier', async () => {
            const res = await chai.request(app)
                .get(`/albums/${albumId}`);
            expect(res.status).to.equal(200);
            expect(res.body.data.title).to.equal(albumOriginal.title);
        });
    });

    describe('PUT /albums/:id', () =>  {
        it ('should not update album if user is not authorized', async () => {
            const res = await chai.request(app)
                .put(`/albums/${albumId}`)
                .send(albumUpdated);
            expect(res.status).to.equal(401);
        });

        it ('should update album that was created earlier', async () => {
            const res = await chai.request(app)
                .put(`/albums/${albumId}`)
                .set('authorization', authHeader)
                .send(albumUpdated);
            expect(res.status).to.equal(200);
            expect(res.body.data.title).to.equal(albumUpdated.title);
        });
    });

    describe('GET /albums/:id', () =>  {
        it ('should return updated album', async () => {
            const res = await chai.request(app)
                .get(`/albums/${albumId}`);
            expect(res.status).to.equal(200);
            expect(res.body.data.title).to.equal(albumUpdated.title);
        });
    });

    describe('DELETE /albums/:id', () =>  {
        it ('should not delete album if user is not authorized', async () => {
            const res = await chai.request(app)
                .delete(`/albums/${albumId}`);
            expect(res.status).to.equal(401);
        });

        it ('should delete album', async () => {
            const res = await chai.request(app)
                .delete(`/albums/${albumId}`)
                .set('authorization', authHeader);
            expect(res.status).to.equal(204);
            expect(res.body.data).not.to.exist;
        });
    });

    describe('GET /albums', () =>  {
        it ('should get all albums in db (empty array)', async () => {
            const res = await chai.request(app)
                .get('/albums');
            expect(res.status).to.equal(200);
            expect(res.body.data).to.be.an('array').that.is.empty;
        });
    });
});

describe('Test /purchases routes', () =>  {
    let authHeader = null;
    const purchaseData = {
        album: null,
        user: '41224d776a326fb40f000001'// random ID for testing since we don't have a route to get users
    };

    before(async () => {
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

    describe('POST /purchases', () => {
        it ('should not create a new Purchase if user is not logged in', async () => {
            const res = await chai.request(app)
                .post('/purchases')
                .send(purchaseData);
            expect(res.status).to.equal(401);
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

    describe('POST /purchases after log out', () => {
        before(async () => {
            const res = await chai.request(app)
                .post('/logout')
                .set('authorization', authHeader);
            expect(res.status).to.equal(204);
            expect(res.headers.authorization).not.to.exist;
        });

        it ('should not create a new Purchase if user has logged out', async () => {
            const res = await chai.request(app)
                .post('/purchases')
                .set('authorization', authHeader)
                .send(purchaseData);
            expect(res.status).to.equal(401);
        });
    });
});
