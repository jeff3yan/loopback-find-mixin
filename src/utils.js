const _ = require('lodash');
const debug = require('debug')('loopback:mixins:find');

/**
 * Parse a "require" filter statement as a set of reverse lookup "includes"
 * Then append the reverse lookup includes as a "WHERE IN" filter on the base model
 * For example we want to search "People" belongsTo "City" belongsTo "Country" where country = "NZ"
 * The filter would look like:
 * {"require": {"city.country": {"name": "NZ"}}} but would compile to something like:
 * {"where": {"cityId": {"inq": [1,2,3,4,5,6,7,8]}}}
 */
module.exports.transformRequireFilter = (ctx, instance, next) => {
  if (!ctx.req.query.filter) return next();

  var filter;
  try {
    filter = JSON.parse(ctx.req.query.filter);
  } catch (err) {
    return next(err);
  }

  const RootModel = ctx.method.ctor;
  const { require } = filter;
  if (!require || _.keys(require).length === 0) return next(); // Skip if no require

  // Reverse condition direction so that it is on the root model rather than the target model
  const conditionPromises = _.map(filter.require, (where, relationName) => {
    return generateReverseCondition(RootModel, relationName, where);
  });

  Promise.all(conditionPromises)
    .then(conditions => {
      debug(`Resultant condition on [${RootModel.modelName}] is`, JSON.stringify(conditions));

      // Extend the existing filter with the current filter set
      const { where } = filter;
      const updatedFilter = where ?
        _.assign({}, filter, {
          where: {and: [where].concat(conditions)}
        }) :
        _.assign({}, filter, {where: {and: conditions}});
      _.set(ctx, 'args.filter', JSON.stringify(updatedFilter));
      return next();
    })
    .catch(err => next(err));
};

/**
 * @param {Model} RootModel The model of which to start traversing relations from
 * @param {String} relationPath The relation path from the root model e.g. "city.country"
 * @param {Object} where The loopbackJS where expression on the target model e.g. {"name": "NZ"}
 */
const generateReverseCondition = function(RootModel, relationPath, where = {}) {
  debug(`Reversing condition on [${RootModel.modelName}] with path [${relationPath}]`, where);
  const relations = relationPath.split('.');

  // The relation that the RootModel has to the adjacent model in the relationPath
  // Currently only supports hasMany or belongsTo
  const rootRelationType = RootModel.settings.relations[relations[0]].type;
  debug(`Relation type is [${rootRelationType}] between [${RootModel.modelName}] and [${relations[0]}]`);

  // From the list of relations, generate a list of associated models
  const modelsForRelations = relationListToModels(RootModel, relations);

  // Build a reverse include from the furthest model back to the root model
  const reversedModels = [].concat(modelsForRelations).reverse();
  const reversedRelations = modelListToRelationNames(reversedModels[0], reversedModels.slice(1));
  const includeScope = buildScope(reversedRelations);

  // If the rootRelationType is "hasMany", then the RootModelId will be a foreignKey on the most adjacent model
  // e.g. for "Person hasMany Product" we are interested in finding a list of "personId" on the "Product" model
  // then this foreignKey "personId" is compared with the "id" field on the root model
  // If the rootRelationType is "belongsTo", then we are interested in the "id" of the most adjacent model
  // e.g. for "Person belongsTo City" we are interested in finding a list of "id" for each matching city
  // then the list of "id" is compared to "cityId" on the root model
  var baseIdField = 'id'; // The id field on the model where we eventually want to see
  if (rootRelationType === 'hasMany') {
    const baseRelation = findRelationForModel(modelsForRelations[0], RootModel);
    baseIdField = baseRelation.details.foreignKey;
  }

  const FurthestModel = reversedModels[0];
  const include = _.get(includeScope, 'scope.include', {});
  return FurthestModel.find({ where, include })
    .then(results => {
      const ids = results.map(item => findLeafIds(
        item.toJSON(),
        reversedRelations,
        baseIdField
      ));

      // Depending on rootRelationType, we are either interested in the "id" of the root model
      // Or a root model which includes a foreignKey id of the most adjacent model
      if (rootRelationType === 'hasMany') {
        return {id: {inq: ids}};
      } else {
        const foreignKey = findRelationForModel(RootModel, modelsForRelations[0])
          .details
          .foreignKey;
        return {[foreignKey]: {inq: _.flatMap(ids, item => item)}};
      }
    });
};

/**
 * Based on an object, find a field (e.g. "id") on the leaf nodes specified by a path
 * Some items along the relation path may be objects and some may be arrays
 * TODO: Handle null values
 * @param {Object} item The item to start a search from
 * @param {Array<String>} pathToChildren A list of attributes to walk down on the item
 * @param {String} rootIdField The field on the leaf nodes to eventually retrieve
 */
const findLeafIds = module.exports.findLeafIds = (item, pathToChildren = [], rootIdField = 'id') => {
  if (pathToChildren && pathToChildren.length === 0) {
    debug(`Retrieving [${rootIdField}] from leaf node`);
    return [item[rootIdField]];
  }
  debug(`Traversing [${pathToChildren}]`);

  // Get the next relation from the result object
  const [currentProperty, ...remainingPath] = pathToChildren;
  const resultItem = item[currentProperty];

  if (resultItem instanceof Array) {
    return _.flatMap(resultItem.map(newItem => findLeafIds(newItem, remainingPath, rootIdField)), item => item);
  } else {
    return findLeafIds(resultItem, remainingPath, rootIdField);
  }
};

/**
 * Recursive relation list to model list resolver
 * @param {Model} Model The root model to start the search from
 * @param {Array<String>} relationsList A list of attributes to walk down on the item
 */
const relationListToModels = module.exports.relationListToModels = (Model, relationsList = []) => {
  if (relationsList && relationsList.length === 0) return [];

  const [currentRelation, ...remainingRelations] = relationsList;
  const adjacentModel = findModelForRelation(Model, currentRelation);
  return [adjacentModel].concat(relationListToModels(adjacentModel, remainingRelations));
};

/**
 * With a root model and a list of related models, build out a relations list
 * e.g. if we have a base model of "Person" and a modelList of [Order, Product]
 * The resultant relations list will be ["orders", "products"]
 * @param {Model} Model The root model to start the search from
 * @param {Array<Model>} modelList A list of models to generate relations from
 */
const modelListToRelationNames = module.exports.modelListToRelationNames = (Model, modelList = []) => {
  if (modelList && modelList.length === 0) return [];

  const [relatedModel, ...remainingModels] = modelList;
  const relationName = findRelationForModel(Model, relatedModel).name;
  return [relationName].concat(modelListToRelationNames(relatedModel, remainingModels));
};

/**
 * Based on a root model, find the relation name if given an adjacent related model
 * @param {Model} Model The root model to start the search from
 * @param {Model} RelatedModel The related model to find the relation name for
 * @returns {Array<Object>} An array of {name, details} where name is the relationName and details is the relation itself
 */
const findRelationForModel = module.exports.findRelationForModel = (Model, RelatedModel) => {
  const relatedModelName = RelatedModel.modelName;
  debug(`Finding relation name between [${Model.modelName}] and [${relatedModelName}]`);
  const foundRelations = [];
  _.forEach(Model.settings.relations, (details, name) => {
    if (details.model === relatedModelName) foundRelations.push({name, details});
  });
  return foundRelations[0];
};

/**
 * Based on a root model, find the model instance which matches a relationName
 * @param {Model} Model The root model to start the search from
 * @param {Model} relationName The relation name on the root model
 * @returns {Model}
 */
const findModelForRelation = module.exports.findModelForRelation = (Model, relationName) => {
  debug(`Finding matching model on [${Model.modelName}] with relation [${relationName}]`);
  const modelName = _.get(Model, `settings.relations.${relationName}.model`);
  return Model.app.models[modelName];
};

/**
 * Recursively build a valid loopbackjs include scope object based on an input
 * array of relations e.g. ['order', 'account', 'user']
 * @param  {Array<String>} relations An array of relation names
 * @return {Object} A valid loopbackjs scope object to include
 */
const buildScope = module.exports.buildScope = function(relations) {
  if (!relations || relations.length === 0) return null;

  const innerScope = buildScope(relations.slice(1));
  const include = _.assign({}, innerScope, {
    relation: relations[0]
  });

  return {
    scope: { include }
  };
};
