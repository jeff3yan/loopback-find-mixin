# Loopback Find Mixin
A mixin that assists with the _filter on related properties_ problem that is present when trying to filter using loopback. Unfortunately, this doesn't fully solve [issue 517](https://github.com/strongloop/loopback/issues/517) but mitigates it somewhat. This mixin implements this functionality on top of loopback, so that it should function with all existing datasource connectors.

#### Current problem
The filtering issue with the loopback ORM is that you cannot filter on related properties. For example, if you have a model set such as:

**Customer** belongsTo **City** belongsTo **Country**

You cannot easily find *all customers which live in a country starting with A*. Typically the way you'd get around this is either through:

1. A custom SQL query, but you end up losing most of the filtering power of loopback as well as the property mappings
2. Doing a query on _countries which start with A_ then including the relations in the opposite direction, e.g. cities. Then finding people with cityIds in that set.

This mixin assists with option 2, which is going to be perfectly performant in some cases and not in others.

#### When to use this mixin
Any time that you would think it's fine to do multiple queries in the opposite direction anyway, then it would be reasonable to use.

# Install
`npm install --save loopback-find`

# Server Config
```
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../node_modules/loopback-find",
      "../common/mixins"
    ]
  }
}
```

# Model Config
```
  {
    "name": "Widget",
    "properties": {
      "name": {
        "type": "string",
      }
    },
    "mixins": {
      "Find" : {
        "remotes": ["find"]
      }
    }
  }
```

# Options
`remotes` is an array of remote method names that this mixin will execute before.

# Usage
In addition to the usual loopback filter parameters `where`, `include`, `limit`, `fields` and `offset`, this mixin exposes another parameter `require`. An example filter:

```
{
  "require": {
    "city.country": {
      "regexp": "^A"
    }
  }
}
```

This will give us the query referred to earlier (find all customers where the country starts with A). This filter is transformed into the following:

```
{
  "where": {
    "cityId": {
      "inq": [...]
    }
  }
}
```