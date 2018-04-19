# accesscontrol-middleware
> config your express routes to have role and attribute based access control.

This middleware helps to config express routes to check permission granted with [accesscontol](https://github.com/onury/accesscontrol).

## Installing / Getting started

Install via npm

```shell
npm install accesscontrol-middleware --save
```

Now define roles and grants via [accesscontol](https://github.com/onury/accesscontrol).

```js
const ac = new AccessControl();
ac.grant('user')                    // define new or modify existing role. also takes an array.
    .createOwn('profile')             // equivalent to .createOwn('profile', ['*'])
    .deleteOwn('profile')
    .readAny('profile')
  .grant('admin')                   // switch to another role without breaking the chain
    .extend('user')                 // inherit role capabilities. also takes an array
    .updateAny('profile')
    .deleteAny('profile');
```

Database knex connection file

```js
// dbConnection.js
const knex = require('knex');

const connection = knex({
  client: 'mysql2',
  debug: false
  ...
});


module.exports = connection;

```
Initialize AccessControlMiddleware

```js
const knexConnection = require('./dbConnection')

const AccessControlMiddleware = require('accesscontrol-middleware');

const accessControlMiddleware = new AccessControlMiddleware(ac, knexConnection);
```
config any express route

```js

route.put('/profile/:userId',
  accessControlMiddleware.check({ 
    resource : 'profile',
    action : 'update',
    checkOwnerShip : true, // optional if false or not provided will check any permission of action
    operands : [
      { source : 'user', key : '_id' },  // means req.user._id (use to check ownership)
      { source : 'params', key : 'userId' } // means req.params.userId (use to check ownership)
    ]
  }),
  controller.updateProfile);
```

## Example with database call

Example where you want to make a database call given a resource parameter id to check if that resource's ownership id is the same as the user's. Below is an example with the following models:  

```js
// User model
User: {
  _id: 'integer',
  username: 'string'
}

// Video model
Video: {
  _id: 'integer',
  title: 'string',
  author_id: 'integer' // this is a foreign key that references User._id
}
```

And this is an example of an express route that uses the above model to check if the user is the author of a video, and if they can access the `read` action for it or not.
```js
route.put('/video/:videoId',
  accessControlMiddleware.check({ 
    resource : 'video',
    action: 'read',
    checkOwnerShip : true,
    useModel: true,
    operands : [
      { source : 'user', key : '_id' },
      { source : 'params', key : 'videoId', modelName: 'video', modelKey: '_id', opKey: 'author_id' }
      ]
    }),
    controller.updateProfile);
```

Below is the actual method that uses the above parameters:

```js
  /**
   * makes a database calling using the given model name, key name, and model id to obtain
   * the 2nd operand.
   * @param {string} modelName database model name, used for the database query
   * @param {string} opKey operand key, typically the equivalent of user_id in the given model
   * @param {string} modelKey model unique key, used to get the specific row which contains the operand value we want
   * @param {string} modelValue value used in the query to compare against the provided modelKey column
   * @returns {promise} returns a promise with the results
   */
  getOperandByModel(modelName, opKey, modelKey, modelValue) {
    return new Promise((resolve, reject) => {
      this._dbDriver
        .select(modelKey, opKey)
        .from(modelName) 
        .where(modelKey, modelValue)
        .first()
        .then((foundObj) => {
          resolve(foundObj[opKey]);
        })
        .catch((err) => {
          reject(err);
        })
    })
  }
```

The resulting SQL query produced from the example would be:
```sql
-- given modelValue = req.params.videoId
SELECT `_id`, `author_id` FROM `video` WHERE `_id` = `modelValue`
```

Then the final comparison to check if the user is allowed access to the resource is to compare the resulting from row from that SQL query to the first operand.  

```js
if(req.user._id.toString() === resultQuery.author_id.toString()) {
  // true, access allowed
} else {
  // false, access denied
}
```


## Tests

```shell
npm test
```
