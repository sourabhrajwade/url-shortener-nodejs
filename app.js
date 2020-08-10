const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const urlExist = require("url-exist");
const crypto = require("crypto");

const urlData = require("./models/url");
// Node Mailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASS,
  },
});
const app = express();

const User = require("./models/user");

app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-with, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  next();
});
const DB_URL = `mongodb+srv://${process.env.DB_UN}:${process.env.DB_PASS}@cluster0-hh5l0.mongodb.net/Shrink?retryWrites=true&w=majority`;
mongoose
  .connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.log(err.message);
    console.log("Database connection error");
  });
mongoose.set("useCreateIndex", true);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// JWT CHECK
const jwtProtect = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.SECRET);
    req.email = { email: decodedToken.email };
    next();
  } catch (err) {
    res.status(401).json({
      message: "You are not authenticated",
    });
  }
};

/** API For Application */
// Check URL exist
app.post("/api/v1/checkurl", async (req, res, next) => {
  const url = req.body.url;
  const exits = await urlExist(url);
  console.log(exits);
});

// Post Request - email, url
app.post("/api/v1/url", jwtProtect, async (req, res, next) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email });
    const postedId = user._id;
    const urlLink = req.body.url;
    const exits = await urlExist(urlLink);
    console.log(exits);
    if (exits === false) {
      return res.status(400).json({
        message: "URL Invalid",
      });
    }
    const randomStr = Math.random().toString(36).substring(7);
    const shortenUrl = `${process.env.SHORT_URL}/${randomStr}`;
    const count = 0;
    const urldata = await new urlData({
      url: urlLink,
      shrinked: shortenUrl,
      postedBy: postedId,
      click: count,
    });
    urldata.save().then((result) => {
      res.status(201).json({
        message: "data recieved",
        result: result,
      });
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "error in url fetching",
    });
  }
});
// Get all urls for a User
app.post("/api/v1/fetchAll", jwtProtect, async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  const Id = user._id;
  const Urls = await urlData.find({ postedBy: Id }, (err, result) => {
    if (err) {
      res.status(500).json({ message: "error in fetching data" });
    }
    res.status(200).json({
      data: result,
    });
  });
});

// Create Custome Path - Required - email,old - oldURl, customepath -
app.put("/api/v1/customeurl", jwtProtect, async (req, res, next) => {
  const email = req.body.email;
  const UserData = await User.findOne({ email });
  const custome = `${process.env.SHORT_URL}/${req.body.customepath}`;
  const oldLink = req.body.old;
  const Urldata = await urlData.findOne({
    postedBy: UserData._id,
    url: oldLink,
  });
  // console.log(Urldata);
  if (!Urldata) {
    res
      .status(500)
      .json({ message: "URL Does not exist. Please create first" });
  }
  const updateData = await urlData.updateOne(
    { postedBy: UserData._id, url: oldLink },
    { $set: { shrinked: custome } }
  );
  const URLRec = await urlData.findOne(
    {
      postedBy: UserData._id,
      url: oldLink,
    },
    (err, info) => {
      if (err) throw error;
      res.status(200).json({
        message: "Custome URL created",
        info,
      });
    }
  );
});


// Redirect Shorted URL
app.put("/api/v1/:key", jwtProtect, async (req, res, next) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({email});
    const postedBy = user._id;
    const shortUrl = `${process.env.SHORT_URL}/${req.params.key}`;
    const Urldata = await urlData.findOne({ postedBy , shrinked: shortUrl });
    console.log(Urldata);
    let updatedCount = Urldata.click + 1;
    const updateDB = await urlData.updateOne(
      { shrinked: shortUrl },
      { $set: { click: updatedCount } }
    );
    if (updateDB.nModified === 0) {
      res.status(500).json({
        message: "URL not found",
      });
    } else {
      // res.status(200).json({ message: "Redirecting" });
      res.redirect(301, Urldata.url);

    }
  } catch (err) {
    console.log(err);
  }
});

// Singup
app.post("/api/v1/signup", async (req, res, next) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = Buffer.from(req.body.password, "base64").toString();
  const data = await User.findOne({ email });
  const token = crypto.randomBytes(32).toString("hex");
  const time = 2 * 60 * 60 * 1000;
  const timestamp = new Date(Date.now() + time);
  if (!data) {
    const salt = 10;
    bcrypt.hash(password, salt).then((hash) => {
      const user = new User({
        name,
        email,
        password: hash,
        passwordresetToken: token,
        passwordresetExpires: timestamp,
      });
      user
        .save()
        .then((result) => {
          transporter.sendMail({
            from: process.env.EMAIL_ID,
            to: req.body.email,

            subject: "Sign Up successful",
            html: `<h1>Hi</h1> <p>Thank you for signup up.  To confirm follow the
            link <a href="${process.env.BASE_URL}api/v1/verifyaccount/${token}">${process.env.BASE_URL}api/v1/verifyaccount/${token}</a></p>`,
            function(err, info) {
              if (err) {
                res.status(500).json({
                  message: "Error occured in sending mail, please try again.",
                });
              } else {
                res.status(200).json({
                  status: "Success",
                  info,
                  message: "Registration succesfull",
                });
              }
            },
          });
          res.status(201).json({
            message: "User created",
            result,
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(400).json({
            message: "Invalid authentication",
          });
        });
    });
  } else {
    return res.status(500).json({
      message: "User Exist",
    });
  }
});

// Account activation
app.put("/api/v1/verifyaccount/:token", async (req, res) => {
  const token = req.params.token;
  const time = new Date();
  const user = await User.findOne({
    passwordresetToken: token,
    passwordresetExpires: { $gt: time },
  });
  if (!user) {
    res.status(400).json({
      message: "User does not exist or token expired",
    });
  }
  const userUpdate = await User.updateOne({ isVerified: true });
  if (!userUpdate) {
    res.status(400).json({
      message: "User not activated",
    });
  }
  res.status(200).json({
    message: "User Activated",
    userUpdate,
  });
});

// Login
app.post("/api/v1/login", async (req, res, next) => {
  let fetchData;
  User.findOne({ email: req.body.email }).then((user) => {
    if (!user) {
      return res.status(501).json({
        message: "User doesnot exists",
      });
    }
    fetchData = user;
    let password = Buffer.from(req.body.password, "base64").toString();
    return bcrypt
      .compare(password, user.password)
      .then((result) => {
        if (!result) {
          return res.status(401).json({
            message: "Auth failed",
          });
        }
        const token = jwt.sign(
          { email: fetchData.email, userId: fetchData._id },
          process.env.SECRET,
          { expiresIn: "1h" }
        );
        res.status(200).json({
          token,
          expiresIn: 3600,
          userId: fetchData._id,
        });
      })
      .catch((err) => {
        console.log(err);
        return res.status(401).json({
          message: "Invalid authentication details",
        });
      });
  });
});

// Forget Password
app.put("/api/v1/forgot", async (req, res, next) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiryInHour = 2;
  const expiry = expiryInHour * 60 * 60 * 1000;
  const timestamp = new Date(Date.now() + expiry);
  console.log(timestamp);
  const urldata = await User.updateMany(
    { email: req.body.email },
    { $set: { passwordresetToken: token, passwordresetExpires: timestamp } }
  );
  const mailSend = await transporter.sendMail({
    from: process.env.EMAIL_ID,
    to: req.body.email,

    subject: "Reset Password Link",
    html: `<h1>Hi</h1> <p>Thank you for signup up.  To confirm follow the
                        link <a href="${process.env.BASE_URL}api/v1/resetpass/${token}">${process.env.BASE_URL}api/v1/resetpass/${token}</a></p>`,
    function(err, info) {
      if (err) {
        res.status(500).json({
          message: "Error occured in sending mail, please try again.",
        });
      } else {
        res.status(200).json({
          status: "Success",
          info,
          message: "Mail sent succesfull",
        });
      }
    },
  });
});

// Reset password route
app.put("/api/v1/resetpass/:token", async (req, res, next) => {
  const token = req.params.token;
  const newPass = Buffer.from(req.body.password, "base64").toString();
  const time = new Date();
  const user = await User.findOne({
    passwordresetToken: token,
    passwordresetExpires: { $gt: time },
  });
  if (!user) {
    res.status(400).json({
      message: "User does not exist or token expired",
    });
  }
  const userUpdate = await User.updateOne({
    password: newPass,
    passwordresetToken: "",
    passwordresetExpires: "",
  });
  if (!userUpdate) {
    res.status(400).json({
      message: "Error in  updating User information",
    });
  }
  res.status(200).json({
    message: "User updated",
    userUpdate,
  });
});

module.exports = app;
