/**
 * Utility tests
 */
const server = require('./fixtures/simple-app/server/server.js');
const assert = require('assert');
const should = require('chai').should();
const Promise = require('bluebird');

const {
  Country,
  City,
  Person,
  Product
} = server.models;

const {
  findModelForRelation,
  findRelationForModel,
  modelListToRelationNames,
  relationListToModels,
  findLeafIds
} = require('../src/utils');

describe('Utility', function() {
  describe('findModelForRelation', () => {
    it('should find on a belongsTo relation', () => {
      findModelForRelation(Person, 'city').should.equal(City);
    });

    it('should find on a hasMany relation', () => {
      findModelForRelation(Person, 'products').should.equal(Product);
    })
  });

  describe('findRelationForModel', () => {
    it('should find on a belongsTo relation', () => {
      findRelationForModel(Person, City).should.deep.equal({
        name: 'city',
        details: Person.settings.relations['city']
      });
    });

    it('should find on a hasMany relation', () => {
      findRelationForModel(Person, Product).should.deep.equal({
        name: 'products',
        details: Person.settings.relations['products']
      });
    })
  });

  describe('modelListToRelationNames', () => {
    it('should generate a single model', () => {
      modelListToRelationNames(Person, [City]).should.deep.equal(['city']);
    });

    it('should generate a list of models', () => {
      modelListToRelationNames(Person, [City, Country]).should.deep.equal(['city', 'country']);
    });

    it('should generate on a belongsTo relation', () => {
      modelListToRelationNames(Person, [Product]).should.deep.equal(['products']);
    });
  });

  describe('relationListToModels', () => {
    it('should generate a single relation', () => {
      relationListToModels(Person, ['city']).should.deep.equal([City]);
    });

    it('should generate a list of relations', () => {
      relationListToModels(Person, ['city', 'country']).should.deep.equal([City, Country]);
    });

    it('should generate on a belongsTo relation', () => {
      relationListToModels(Person, ['products']).should.deep.equal([Product]);
    });
  });

  describe('findLeafIds', () => {
    it('should get an id from a leaf node', () => {
      findLeafIds({id: 111}).should.deep.equal([111]);
    });

    it('should get an id from a nested object', () => {
      findLeafIds({id: 111, leaf: { id: 222 }}, ['leaf']).should.deep.equal([222]);
    });

    it('should get a list of ids from a nested array', () => {
      findLeafIds({id: 111, items: [
        {id: 1},
        {id: 2},
        {id: 3}
      ]}, ['items']).should.deep.equal([1,2,3]);
    });

    it('should get a list of ids from nested nested arrays ', () => {
      findLeafIds({id: 111, items: [
        {
          id: 1,
          next: [
            {id: 100},
            {id: 200},
            {id: 300}
          ]
        },
        {
          id: 2,
          next: [
            {id: 400},
            {id: 500},
            {id: 600}
          ]
        },
        {
          id: 3,
          next: [
            {id: 700},
            {id: 800},
            {id: 900}
          ]
        }
      ]}, ['items', 'next']).should.deep.equal([
        100,
        200,
        300,
        400,
        500,
        600,
        700,
        800,
        900
      ]);
    });
  });
});