
class AccessControlMiddleware {
  /**
   * @param {object} accessControl access control rules object.
   */

   /**
    * @param {object} accessControl the accesscontrol library itself
    * @param {object} dbDriver database driver, for this case i'm specifically using knex so it must be a knex connection.
    */
  constructor(accessControl, dbDriver) {
    this._accessControl = accessControl;
    this._dbDriver = dbDriver;
  }

  /**
   * check permission
   * @param {object} params parameters.
   * @param {string} params.resource resource name.
   * @param {string} params.action action would be any of create, read, update & delete.
   * @param {boolean} params.checkOwnerShip flag to check ownership on resource.
   * @param {Object[]} params.operands operands which will compare to check ownership.
   * @param {string} params.operands.source source to get operand value (body, params, query, and whichever present in req object).
   * @param {string} params.operands.key key to get operand value.
   * @returns {function} middleware to append in express.js route.
   */

  check ({ resource, action, checkOwnerShip = false, useModel = false, operands = []}) {

    return (req, res, next) => {

      const actions = {};
      
      switch (action) {
  
        case 'create' : 
        actions.any = 'createAny';
        actions.own = 'createOwn';
        break;
  
        case 'update' : 
        actions.any = 'updateAny';
        actions.own = 'updateOwn';
        break;
  
  
        case 'read' : 
        actions.any = 'readAny';
        actions.own = 'readOwn';
        break;
  
  
        case 'delete' : 
        actions.any = 'deleteAny';
        actions.own = 'deleteOwn';
        break;
  
        default:
        return next(new Error('invalid action'));
      }

      // as most passport strategy assign user object to req.
      const role = req.user.role; 
      let permission = {};

      permission = this._accessControl.can(role);

      

      if (checkOwnerShip) {

        if (operands.length !== 2) {
          return next(new Error('must be two operands to check ownership'))
        }

        const firstOperand = req[operands[0].source][operands[0].key];
        let getSecondOpPromise;

        if(useModel) {
          const modelName = operands[1].modelName;
          const modelKey  = operands[1].modelKey;
          const opKey = operands[1].opKey;
          const modelValue = req[operands[1].source][operands[1].key];
          getSecondOpPromise = this.getOperandByModel(modelName, opKey, modelKey, modelValue);
        } else {
          getSecondOpPromise = this.getOperandByReq(req, operands[1]);
        }

        getSecondOpPromise
        .then((secondOperand) => {
          if (firstOperand.toString() === secondOperand.toString()) {
            permission = permission[actions.own](resource);
          } else {
            permission = permission[actions.any](resource);
          }

          if (permission.granted) {
            return next();
          } else {
            return res.status(403).send();
          } 
        })
      } else {
        permission = permission[actions.any](resource);
        if (permission.granted) {
          return next();
        } else {
          return res.status(403).send();
        } 
      }
    };
  }


  getOperandByReq(req, operand) {
    return new Promise((resolve, reject) => {
       resolve(req[operand.source][operand.key]);
    })
  }

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
}

module.exports = AccessControlMiddleware;