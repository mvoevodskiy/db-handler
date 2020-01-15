const {createConnection} = require("typeorm");

/** @class DBHandler
 *
 * @property {MVLoader} App
 * @property {MVTools} MT
 * @property {typeorm} DB
 */

class DBHandler {

    #dbUp = false;
    config = {};
    defaults = {
        global: true,
        globalProperty: DB,
        typeorm: {
            name: "default",
            type: "mysql",
            host: 'localhost',
            port: 3306,
            username: '',
            password: '',
            database: '',
            synchronize: true,
            // logging: 'all',
            entities: [],
        },
    };

    DB;

    constructor(App, config) {
        this.App = App;
        this.MT = this.App.MT;
        if (this.MT.empty(config)) {
            config = {
                typeorm: this.MT.extract('db', this.App.config, {})
            };
        }
        this.loadConfig(config);
    }

    async loadConfig (config) {
        this.config = this.MT.mergeRecursive(this.defaults, this.config, config);
    }

    async init () {
        if (!this.MT.empty(this.config.typeorm.type)) {
            this.DB = await createConnection(this.config.typeorm)
                .then(connection => {
                    this.DB = connection;
                    this.#dbUp = true;
                    this.setGlobal();
                }).catch(error => {
                    this.#dbUp = false;
                });
        }
    }

    setGlobal () {
        if (this.config.global && !this.MT.empty(this.config.globalProperty)) {
            this.App[this.config.globalProperty] = this.DB;
        }
    }

    get available () {
        return this.#dbUp;
    }
}

module.exports = DBHandler;