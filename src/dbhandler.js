const Sequelize = require('sequelize');

/** @class DBHandler
 *
 * @property {MVLoader} App
 * @property {MVTools} MT
 * @property {sequelize} DB
 */

class DBHandler {

    #dbUp = false;
    config = {};
    defaults = {
        global: true,
        globalProperty: 'DB',
        sync: false,
        sequelize: {
            name: "default",
            dialect: "mysql",
            host: 'localhost',
            port: 3306,
            username: '',
            password: '',
            database: '',
            synchronize: true,
            logging: 'false',
        },
        models: {},
    };

    DB;

    constructor(App, config) {
        this.App = App;
        this.MT = this.App.MT;
        if (this.MT.empty(config) || this.MT.empty(Object.keys(config))) {
            config = {
                sequelize: this.MT.extract('db', this.App.config, {})
            };
        }
        this.loadConfig(config);
    }

    async loadConfig (config) {
        this.config = this.MT.mergeRecursive(this.defaults, this.config, config);
    }

    async init () {
        if (!this.MT.empty(this.config.sequelize.dialect)) {
            try {
                this.DB = new Sequelize(this.config.sequelize);
                this.initModels();
                this.#dbUp = true;
                this.setGlobal();
                await this.sync();
            } catch (err) {
                this.#dbUp = false;
                console.error('DB HANDLER. DB FAILED. ERROR: ', err);
            }
        }

    }

    initModels () {
        for (let model in this.config.models) {
            if (this.config.models.hasOwnProperty(model)) {
                if (this.MT.isString(this.config.models[model])) {
                    this.DB.import(this.config.models[model]);
                } else {
                    this.DB.define(model, this.config.models[model](Sequelize));
                }
            }
        }
    }

    setGlobal () {
        if (this.config.global && !this.MT.empty(this.config.globalProperty)) {
            this.App[this.config.globalProperty] = this.DB;
        }
    }

    sync () {
        return this.config.sync ? this.DB.sync() : Promise.resolve();

    }

    get available () {
        return this.#dbUp;
    }
}

module.exports = DBHandler;