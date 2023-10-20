var express = require("express");
var app = express();
const path = require("path");
const bodyParser = require("body-parser");

const fs = require("fs");

const session = require("express-session");

app.use(
  session({
    secret: "phane",
    resave: false,
    saveUninitialized: true,
  })
);

const requireLogout = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

app.set("view engine", "ejs");

app.use("/static", express.static(path.join(__dirname, "static")));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/pages" + "/home.html");
});

app.get("/about", function (req, res) {
  res.sendFile(path.join(__dirname, "pages", "about.html"));
});

app.get("/login", requireLogout, (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "login.html"));
});

app.get("/register", requireLogout, function (req, res) {
  res.sendFile(path.join(__dirname, "pages", "register.html"));
});

const mongoose = require("mongoose");
const { Schema } = mongoose;
const port = 3000;

const uri =
  "mongodb+srv://phanindra:phane123@phane.vzfskpy.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

const registrationSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Registration = mongoose.model("Registration", registrationSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide both email and password" });
  }

  try {
    const newRegistration = new Registration({ email, password });
    await newRegistration.save();
    req.session.userId = newRegistration._id;
    res.redirect("/dashboard");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Server error, failed to register" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide both email and password" });
  }

  try {
    var existingRegistration = await Registration.findOne({ email, password });
    if (!existingRegistration) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    req.session.userId = existingRegistration._id;
    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).json({ error: "Server error, failed to log in" });
  }
});

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "Registration" },
});

const Product = mongoose.model("Product", productSchema);

app.post("/dashboard", async (req, res) => {
  const { name, description, price } = req.body;

  try {
    const newProduct = new Product({ name, description, price });
    await newProduct.save();

    res.redirect("/shop");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding product to the database");
  }
});

app.get("/shop", requireLogout, async (req, res) => {
  try {
    const products = await Product.find({});
    const loggedIn = req.session.userId ? true : false;
    res.render("shop", { products: products, loggedIn: loggedIn });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching products from the database");
  }
});

app.get("/dashboard", async (req, res) => {
  const sellerId = req.session.userId;

  try {
    const products = await Product.find({ seller: sellerId }).populate(
      "seller"
    );
    //   console.log(sellerId);
    //  console.log(products);
    res.render("dashboard", { products: products });
  } catch (error) {
    res.status(500).send("Error fetching products from the database");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to destroy session" });
    }
    // res.clearCookie('connect.sid');
    res.redirect("/");
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
