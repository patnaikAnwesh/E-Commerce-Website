const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("Connected to MongoDB successfully");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error.message);
        process.exit(1);
    });

// API Creation
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Creating upload endpoint for images
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('image'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

// Schema for creating products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

app.post('/addproduct', async (req, res) => {
    try {
        let products = await Product.find({});
        let id;
        if (products.length > 0) {
            let lastProduct = products[products.length - 1];
            id = lastProduct.id + 1;
        } else {
            id = 1;
        }

        const product = new Product({
            id: id,
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price,
        });

        await product.save();
        res.json({
            success: true,
            name: req.body.name,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating API for deleting products
app.post('/removeproduct', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.body.id });
        res.json({
            success: true,
            id: req.body.id,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        console.log(products)
        res.json(products);
       
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }

});

// Schema for creating user model
const Users = mongoose.model('Users', {
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

// Creating endpoint for registering the user
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Missing required fields: name, email, or password." });
    }

    try {
        // Check for existing user
        let existingUser = await Users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "Existing user found with the same email address." });
        }

        // Initialize cart data
        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        // Create a new user
        const user = new Users({
            name,
            email,
            password,
            cartData: cart,
        });

        await user.save();

        // Generate JWT token
        const data = {
            user: {
                id: user.id
            }
        };
        const token = jwt.sign(data, process.env.JWT_SECRET || 'default_secret');

        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating endpoint for user login
app.post('/login', async (req, res) => {
    try {
        let user = await Users.findOne({ email: req.body.email });
        if (user) {
            const passCompare = req.body.password === user.password;
            if (passCompare) {
                const data = {
                    user: {
                        id: user.id
                    }
                };
                const token = jwt.sign(data, process.env.JWT_SECRET || 'default_secret');
                res.json({ success: true, token });
            } else {
                res.json({ success: false, errors: "Wrong Password" });
            }
        } else {
            res.json({ success: false, errors: "Wrong Email Id" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
//creating endpoint for newcollection data
app.get('/newcollections',async(req,res)=>{
    let products = await Product.find({})
    let newcollection = products.slice(1).slice(-8)
    console.log("NewCollection Fetched")
    res.send(newcollection)
})

//creating endpoint for popular in women data
app.get('/popularinwomen', async (req, res) => {
    try {
        let products = await Product.find({ category: "women" });
        let popular_in_women = products.slice(0, 4);
        console.log("Popular in women fetched");
        res.send(popular_in_women);
    } catch (error) {
        console.error("Error fetching popular women products:", error);
        res.status(500).send("Server error");
    }
});

//creating endpoint for adding products in cartdata
app.post('/addtocart',async(req,res)=>[
    console.log(req.body)
    
])


// Start the server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on port " + port);
    } else {
        console.log("Error starting server: " + error);
    }
});
