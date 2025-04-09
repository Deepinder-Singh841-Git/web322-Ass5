//Name: Deepinder Singh
//Student ID: 159466234
//Date: 2021-08-15
//Purpose: Assignment 4
//class: web322 NII


const express = require('express');
const path = require('path');
const storeService = require('./store-service');
const multer = require("multer");
const expHBS = require('express-handlebars');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const Handlebars = require('handlebars');
const pg = require('pg');

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Handlebars setup
const hbs = expHBS.create({
    extname: '.hbs',
    helpers: {
        navLink: function (url, options) {
            return '<li' + ((url == app.locals.activeRoute) ? ' class="active"' : '') + '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3) throw new Error("Handlebars Helper equal needs 2 parameters");
            return (lvalue != rvalue) ? options.inverse(this) : options.fn(this);
        },
        safeHTML: function (html) {
            return new Handlebars.SafeString(html);
        },
        formatDate: function (dateObj) {
            if (!dateObj) return '';
            let year = dateObj.getFullYear();
            let month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            let day = dateObj.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
        truncate: function (str, len) {
            if (str.length > len) {
                return str.substring(0, len) + '...';
            }
            return str;
        }
    }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME || 'dfst9j74g',
    api_key: process.env.CLOUDINARY_KEY || '332178947425628',
    api_secret: process.env.CLOUDINARY_SECRET || 'y7M6d7_J5Feh4jbgowjFyOT4pw8',
    secure: true
});

const upload = multer();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(function (req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute = '/' + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, '') : route.replace(/\/(.*)/, ''));
    app.locals.viewingCategory = req.query.category;
    next();
});

// Routes
app.get('/', async (req, res) => {
    try {
        const featuredItems = await storeService.getPublishedItems();
        res.render('home', {
            featuredItems: featuredItems.slice(0, 3) // Show first 3 published items
        });
    } catch (err) {
        res.render('home', {
            featuredItems: [],
            message: "Error loading featured items"
        });
    }
});

app.get('/about', (req, res) => {
    res.render('about');
});

// [Include all your other routes here...]
// Route for "/shop"
app.get("/shop", async (req, res) => {
    let viewData = {};
    try {
        let items = req.query.category ? await storeService.getPublishedItemsByCategory(req.query.category) : await storeService.getPublishedItems();
        items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
        let item = items[0]; // Get the latest item
        viewData.items = items;
        viewData.post = item; // Store the latest item
    } catch (err) {
        viewData.message = "No results";
    }

    try {
        let categories = await storeService.getCategories();
        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "No results";
    }

    res.render("shop", { data: viewData });
});

// Route for "/shop/:id"
app.get('/shop/:id', async (req, res) => {
    let viewData = {};
    try {
        let items = req.query.category ? await storeService.getPublishedItemsByCategory(req.query.category) : await storeService.getPublishedItems();
        items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
        viewData.items = items;
    } catch (err) {
        viewData.message = "No results";
    }

    try {
        viewData.post = await storeService.getItemById(req.params.id);
    } catch (err) {
        viewData.message = "No results";
    }

    try {
        let categories = await storeService.getCategories();
        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "No results";
    }

    res.render("shop", { data: viewData });
});

// Route for "/items"
app.get('/items', async (req, res) => {
    try {
        let items = await storeService.getAllItems(); // Fetch all items
        res.render('items', { items: items }); // Render the items view
    } catch (err) {
        res.render('items', { message: "No results found" }); // Handle errors
    }
});

// Route for "/items/add"
app.get("/items/add", (req, res) => {
    res.render("addPost"); // Render the addPost.hbs view
});

// Handle adding a new item with optional image upload
app.post("/items/add", upload.single("featureImage"), (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            return result;
        }

        upload(req).then((uploaded) => {
            processItem(uploaded.url);
        }).catch((error) => {
            console.error("Cloudinary upload error:", error);
            processItem("");
        });
    } else {
        processItem("");
    }

    function processItem(imageUrl) {
        req.body.featureImage = imageUrl;
        storeService.addItem(req.body)
            .then(() => res.redirect("/items"))
            .catch(err => res.status(500).send("Failed to add item: " + err));
    }
});

// Route for "/categories"
app.get('/categories', async (req, res) => {
    try {
        const categories = await storeService.getCategories();
        res.render('categories', { categories: categories });
    } catch (err) {
        res.render('categories', { message: "No results" });
    }
});

// GET route to show the add category form
app.get('/categories/add', (req, res) => {
    res.render('addCategory');
});

// POST route to handle category addition
app.post('/categories/add', (req, res) => {
    storeService.addCategory(req.body)
        .then(() => res.redirect('/categories'))
        .catch(err => res.status(500).send("Unable to add category"));
});

app.get('/categories/delete/:id', (req, res) => {
    storeService.deleteCategoryById(req.params.id)
        .then(() => res.redirect('/categories'))
        .catch(err => res.status(500).send("Unable to remove category"));
});

// Custom 404 Route
app.use((req, res) => {
    res.status(404).render("404"); // Render a 404.hbs view
});


// Initialize and start server
storeService.initialize()
    .then(() => {
        app.listen(HTTP_PORT, () => {
            console.log(`Server running on http://localhost:${HTTP_PORT}`);
        });
    })
    .catch(err => {
        console.error('Initialization failed:', err);
        process.exit(1);
    });
