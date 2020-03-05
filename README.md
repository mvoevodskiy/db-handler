#mvl-db-handler
Пакет предназначен для подключения ORM [Sequelize](https://www.npmjs.com/package/sequelize) к проектам на основе 
[MVLoader](https://www.npmjs.com/package/mvloader).

После инициализации создается свойство **App.DB**, в котором находится активное соединение с БД.  
Дополнительно создается свойство **App.DB.S**, в котором находится подключенный пакет _Sequelize_. Это позволяет из любого 
места, где доступно подключение к БД через **this.App.DB**, быстро получать доступ к служебным сущностям, 
таким как **Op** и аналогичным. Например, ```[this.App.DB.S.Op.and]```

## Установка
```npm i mvl-db-handler --save```

## Подключение к проекту MVLoader
```
let config = {
    ext: {
        classes: {
            handlers: {
                DBHandler: DBHandler,
            },
        },
        configs: {
            handlers: {
                DBHandler: {
                    sequelize: {
                        host: process.env.DB_HOST, // По умолчанию - localhost. Можно не указывать, если не отличается
                        port: process.env.DB_PORT, // По умолчанию - 3306. Можно не указывать, если не отличается
                        username: process.env.DB_USERNAME,
                        password: process.env.DB_PASSWORD,
                        database: process.env.DB_DATABASE,
                    },
                    models: {
                        mvlUser: require('./models/mvlUser'),
                        mvlUserGroup: require('./models/mvlUserGroup'),
                    }
                }
            }
        }
    },
};

let app = new App(config);
```

## Загрузка моделей
Помимо стандартного способа загрузки моделей с помощью методов **Sequelize** поддерживается загрузка из конфигурации.  
В примере выше загружаются 2 модели: _mvlUser_ и _mvlUserGroup_.

Пример содержимого модели:
```
module.exports = (Sequelize) => {
    // Масссив из 3-х объектов
    return [
        // Поля модели
        {
            username: {
                type: Sequelize.STRING,
                defaultValue: '',
                allowNull: false,
                unique: true,
                set(val) {
                    if (val === '' || typeof val !== 'string') {
                        val = this.getDataValue('username') !== '' ? this.getDataValue('username') : 'user_' + Date.now();
                    }
                    this.setDataValue('username', val);
                }
            },
            // Остальные поля ниже
        },
        // Опции модели
        {
            hooks: {
                beforeCreate: (user, options) => {
                    if (user.username === '') {
                        user.username = '';
                    }
                },
            },
        },
        // Ассоциации модели
        {
            'belongsToMany': [
                {
                    model: 'mvlUserGroup',
                    as: 'Groups',
                    through: {
                        model: 'mvlUserGroupMember'
                    }

                },
            ],
            'hasMany': [
                {
                    model: 'BotCMSUser',
                },
            ],
            'hasOne': [
                {
                    model: 'mvlUserProfile',
                    as: 'Profile',
                    foreignKey: 'UserId',
                }
            ],
        }
    ];

};
```