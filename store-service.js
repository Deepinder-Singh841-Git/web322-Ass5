const Sequelize = require('sequelize');

// Initialize Sequelize with your Neon.tech credentials
const sequelize = new Sequelize('neondb', 'neondb_owner', 'npg_hFtk4deZq9IU', {
    host: 'ep-falling-dream-a5jg4e56-pooler.us-east-2.aws.neon.tech',
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    },
    query: { raw: true }
});

// Define Models
const Item = sequelize.define('Item', {
    body: Sequelize.TEXT,
    title: Sequelize.STRING,
    postDate: Sequelize.DATE,
    featureImage: Sequelize.STRING,
    published: Sequelize.BOOLEAN,
    price: Sequelize.DOUBLE
});

const Category = sequelize.define('Category', {
    category: Sequelize.STRING
});

// Define relationship
Item.belongsTo(Category, { foreignKey: 'category' });

module.exports = {
    initialize: function () {
        return new Promise((resolve, reject) => {
            sequelize.sync()
                .then(() => resolve())
                .catch(err => reject("unable to sync the database"));
        });
    },

    getAllItems: function () {
        return new Promise((resolve, reject) => {
            Item.findAll()
                .then(data => resolve(data))
                .catch(err => reject("no results returned"));
        });
    },

    getPublishedItems: function () {
        return new Promise((resolve, reject) => {
            Item.findAll({ where: { published: true } })
                .then(data => resolve(data))
                .catch(err => reject("no results returned"));
        });
    },

    getPublishedItemsByCategory: function (category) {
        return new Promise((resolve, reject) => {
            Item.findAll({
                where: {
                    published: true,
                    category: category
                }
            })
                .then(data => resolve(data))
                .catch(err => reject("no results returned"));
        });
    },

    getCategories: function () {
        return new Promise((resolve, reject) => {
            Category.findAll()
                .then(data => resolve(data))
                .catch(err => reject("no results returned"));
        });
    },

    addItem: function (itemData) {
        return new Promise((resolve, reject) => {
            itemData.published = itemData.published ? true : false;

            for (const key in itemData) {
                if (itemData[key] === "") itemData[key] = null;
            }

            itemData.postDate = new Date();

            Item.create(itemData)
                .then(() => resolve())
                .catch(err => reject("unable to create post"));
        });
    },

    getItemById: function (id) {
        return new Promise((resolve, reject) => {
            Item.findAll({ where: { id: id } })
                .then(data => {
                    if (data.length > 0) resolve(data[0]);
                    else reject("no results returned");
                })
                .catch(err => reject("no results returned"));
        });
    },

    getItemsByCategory: function (category) {
        return new Promise((resolve, reject) => {
            Item.findAll({ where: { category: category } })
                .then(data => resolve(data))
                .catch(err => reject("no results returned"));
        });
    },

    getItemsByMinDate: function (minDateStr) {
        const { gte } = Sequelize.Op;
        return new Promise((resolve, reject) => {
            Item.findAll({
                where: {
                    postDate: {
                        [gte]: new Date(minDateStr)
                    }
                }
            })
                .then(data => resolve(data))
                .catch(err => reject("no results returned"));
        });
    },

    addCategory: function (categoryData) {
        return new Promise((resolve, reject) => {
            // Clean empty values
            for (const key in categoryData) {
                if (categoryData[key] === "") categoryData[key] = null;
            }

            Category.create(categoryData)
                .then(() => resolve())
                .catch(err => reject("unable to create category"));
        });
    },

    deleteCategoryById: function (id) {
        return new Promise((resolve, reject) => {
            Category.destroy({ where: { id: id } })
                .then(() => resolve())
                .catch(err => reject("Unable to delete category"));
        });
    },

    deletePostById: function (id) {
        return new Promise((resolve, reject) => {
            Item.destroy({ where: { id: id } })
                .then(() => resolve())
                .catch(err => reject("unable to delete post"));
        });
    }
};