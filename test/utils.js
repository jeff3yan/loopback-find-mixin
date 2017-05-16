const server = require('./fixtures/simple-app/server/server.js');

const { Country, City, Person, Product } = server.models;

module.exports.scaffoldData = () => {
  const promises = [
    Country.create({id: 100, name: 'NZ'}),
    Country.create({id: 200, name: 'AUS'}),

    City.create({id: 110, name: 'Auckland', countryId: 100}),
    City.create({id: 120, name: 'Wellington', countryId: 100}),
    City.create({id: 210, name: 'Melbourne', countryId: 200}),
    City.create({id: 220, name: 'Sydney', countryId: 200}),

    Person.create({id: 111, name: 'John', cityId: 110}),
    Person.create({id: 112, name: 'Joe', cityId: 110}),
    Person.create({id: 121, name: 'Jeff', cityId: 120}),
    Person.create({id: 122, name: 'Jane', cityId: 120}),
    Person.create({id: 211, name: 'Sam', cityId: 210}),
    Person.create({id: 212, name: 'Sandy', cityId: 210}),
    Person.create({id: 221, name: 'Steve', cityId: 220}),
    Person.create({id: 222, name: 'Seth', cityId: 220}),

    Product.create({id: 1110, name: 'A1', personId: 111}),
    Product.create({id: 1120, name: 'A2', personId: 112}),
    Product.create({id: 1210, name: 'B1', personId: 121}),
    Product.create({id: 1220, name: 'B2', personId: 122}),
    Product.create({id: 2110, name: 'C1', personId: 211}),
    Product.create({id: 2120, name: 'C2', personId: 212}),
    Product.create({id: 2210, name: 'D1', personId: 221}),
    Product.create({id: 2220, name: 'D2', personId: 222})
  ];

  return Promise.all(promises);
};

module.exports.destroyAll = () => Promise.all([
  Country.destroyAll(),
  City.destroyAll(),
  Person.destroyAll(),
  Product.destroyAll()
]);