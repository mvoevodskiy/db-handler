const Sequelize = require('sequelize')

/**
 * @typedef mvlModel
 * @type {Array}
 * @property {Object.<string, string|function>} Model fields
 * @property {Object.<string, string|Object|Array.<*>>}
 * @property {Object.<string, Array.<Object.<string, string|Object.<string, *>>>>}
 */
/** @class DBHandler
 *
 * @property {import('mvloader').MVLoader} App
 * @property {Object<import('mvtools')>} MT
 * @property {Sequelize} DB
 * @property {Sequelize} DB.S
 * @property {Object.<string, import('sequelize').Model>} DB.models
 */

class DBHandler {
  constructor (App, config) {
    this.App = App
    this.MT = this.App.MT
    this._dbUp = false
    this.config = {}
    this.defaults = {
      global: true,
      globalProperty: 'DB',
      sync: false,
      sequelize: {
        name: 'default',
        dialect: 'mysql',
        host: 'localhost',
        port: 3306,
        username: '',
        password: '',
        database: '',
        synchronize: true,
        logging: false
      },
      /** @type {Object.<string, mvlModel>} */
      models: {}
    }

    this.DB = null
    if (this.MT.empty(config) || this.MT.empty(Object.keys(config))) {
      config = {
        sequelize: this.MT.extract('db', this.App.config, {})
      }
    }
    this.loadConfig(config)
  }

  loadConfig (config) {
    this.config = this.MT.mergeRecursive(this.defaults, this.config, config)
  }

  async init () {
    if (!this.MT.empty(this.config.sequelize.dialect)) {
      try {
        this.DB = new Sequelize(this.config.sequelize)
        this.DB.S = Sequelize
        this.initModels()
        this._dbUp = true
        this.setGlobal()
        await this.sync()
      } catch (err) {
        this._dbUp = false
        console.error('DB HANDLER. DB FAILED. ERROR: ', err)
      }
    }
  }

  initModels () {
    const allAssociations = {}
    const allScopes = {}
    for (const modelName in this.config.models) {
      if (Object.prototype.hasOwnProperty.call(this.config.models, modelName)) {
        if (this.MT.isString(this.config.models[modelName])) {
          this.DB.import(this.config.models[modelName])
        } else {
          let modelDefine = this.config.models[modelName](Sequelize)
          if (!Array.isArray(modelDefine)) {
            modelDefine = [modelDefine]
          }
          if (modelDefine[1] !== undefined && modelDefine[1].scopes !== undefined) {
            allScopes[modelName] = modelDefine[1].scopes
            delete modelDefine[1].scopes
          }
          this.DB.define(modelName, ...modelDefine)
          if (modelDefine[2] !== undefined) {
            allAssociations[modelName] = modelDefine[2]
          }
        }
      }
    }
    for (const modelName in allAssociations) {
      if (Object.prototype.hasOwnProperty.call(allAssociations, modelName)) {
        const associations = allAssociations[modelName]
        for (const associationType in associations) {
          if (Object.prototype.hasOwnProperty.call(associations, associationType)) {
            for (let foreignModel of associations[associationType]) {
              let opts = {}
              if (typeof foreignModel === 'object') {
                opts = foreignModel
                foreignModel = foreignModel.model
              }
              foreignModel = this.getModel(foreignModel)
              delete opts.model

              if (opts.through !== undefined) {
                opts.through.model = this.getModel(opts.through.model)
              }

              try {
                if (!this.MT.empty(foreignModel)) {
                  /** @typedef {{associationAccessor: string}} association */
                  const association = this.DB.models[modelName][associationType](foreignModel, opts)
                  this.DB.models[modelName][association.associationAccessor] = association
                }
              } catch (e) {
                console.error('FAILED ADDING ASSOCIATION FOR MODEL ', modelName, '. DETAILS: ', e)
              }
            }
          }
        }
      }
    }
    for (const modelName in allScopes) {
      if (Object.prototype.hasOwnProperty.call(allScopes, modelName)) {
        const scopes = allScopes[modelName]
        for (const scope in scopes) {
          if (Object.prototype.hasOwnProperty.call(scopes, scope)) {
            if (scopes[scope].include !== undefined) {
              scopes[scope].include = this.MT.makeArray(scopes[scope].include)
              for (const include of scopes[scope].include) {
                if (typeof include.model === 'string') {
                  include.model = this.getModel(include.model)
                }
              }
            }
            this.DB.models[modelName].addScope(scope, scopes[scope])
          }
        }
      }
    }
  }

  /**
   * @param {string} def
   * @return {typeof import('sequelize').Model}
   */
  getModel (def) {
    if (typeof def === 'function') {
      def = def(this)
    } else if (this.MT.isString(def)) {
      def = this.DB.models[def]
    }
    return def
  }

  setGlobal () {
    if (this.config.global && !this.MT.empty(this.config.globalProperty)) {
      this.App[this.config.globalProperty] = this.DB
    }
  }

  sync () {
    return this.config.sync ? this.DB.sync({ alter: true }) : Promise.resolve()
  }

  get available () {
    return this._dbUp
  }
}

/** @type {Sequelize} */
DBHandler.Sequelize = Sequelize
/** @type {Sequelize.Model} */
DBHandler.Model = Sequelize.Model
// Object.assign(DBHandler.Sequelize, { getModel: DBHandler.getModel })

DBHandler.DB = {}
/** @type {mvlModel} **/
DBHandler.mvlModel = []

module.exports = DBHandler
