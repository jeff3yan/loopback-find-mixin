const server = require('./fixtures/simple-app/server/server.js');
const request = require('supertest')(server);
const assert = require('assert');
const loopback = require('loopback');
const should = require('chai').should();
const Promise = require('bluebird');

const { scaffoldData, destroyAll } = require('./utils');

describe('api endpoints', function() {
  beforeEach(destroyAll);

  it('pass through if no filter is present', done => {
    scaffoldData()
      .then(() => request.get('/api/People'))
      .then(res => {
        res.body.map(item => item.id).should.deep.equal([111, 112, 121, 122, 211, 212, 221, 222]);
        done();
      })
      .catch(done);
  });

  it('throw an error with invalid json', done => {
    scaffoldData()
      .then(() => request.get('/api/People?filter=abcd'))
      .then(res => {
        res.statusCode.should.equal(500);
        done();
      })
      .catch(done);
  });

  it('filter people based on country', done => {
    const filter = {
      "order": "id",
      "require": {
        "city": {"name": "Auckland"}
      }
    };
    scaffoldData()
      .then(() => request.get(`/api/People?filter=${JSON.stringify(filter)}`))
      .then(res => {
        res.body.map(item => item.id).should.deep.equal([111, 112]);
        done();
      })
      .catch(done);
  });

  it('filter countries based on people', done => {
    const filter = {
      "order": "id",
      "require": {
        "cities.people": {"name": "Seth"}
      }
    };
    scaffoldData()
      .then(() => request.get(`/api/Countries?filter=${JSON.stringify(filter)}`))
      .then(res => {
        res.body.map(item => item.id).should.deep.equal([200]);
        done();
      })
      .catch(done);
  });

  it('filter people based on city and product', done => {
    const filter = {
      "order": "id",
      "require": {
        "city.country": {"name": "NZ"},
        "products": {"name": "A1"}
      }
    };
    scaffoldData()
      .then(() => request.get(`/api/People?filter=${JSON.stringify(filter)}`))
      .then(res => {
        res.body.map(item => item.id).should.deep.equal([111]);
        done();
      })
      .catch(done);
  });
})