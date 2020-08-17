const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const urlExist = require("url-exist");
const crypto = require("crypto");
const User = require("./models/user");
// Node Mailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASS,
  },
});
const app = express();

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
function checkExist(url) {
  const exits = urlExist(url);
  return exits;
}
app.post("/api/v1/checkurl", async (req, res, next) => {
  const url = req.body.url;
  const bool = checkExist(url);
  if (bool === true) {
    res.status(200).json({
      message: "User exist",
    });
  } else {
    res.status(400).json({
      message: "User does not exist",
    });
  }
});

// Get User Request
app.post("/api/v1/getbyId", async (req, res, next) => {
  const heyId = req.body.userId;
  const user = await User.findOne({ _id: heyId });
  res.status(200).json({
    message: "userdata",
    result: user,
  });
});
// Post Request - email, url - Add URL to database
app.post("/api/v1/addUrl", async (req, res, next) => {
  try {
    const postedId = req.body.userId;
    const urlLink = req.body.url;
    const user =await  User.findOne({ _id: postedId});
    const exits = await urlExist(urlLink);
    console.log(exits);
    if (!user || exits === false) {
      return res.status(400).json({
        message: "User doesn't exist or URL Invalid",
      });
    }
    const randomStr = Math.random().toString(36).substring(7);
    const shortenUrl = `${process.env.SHORT_URL}/${randomStr}`;
    const url = await user.urls;
    // console.log(url);
    const urlData = {
      url: urlLink,
      shrinked: shortenUrl,
    };

    const urldata = await User.findByIdAndUpdate(postedId, {
      $addToSet: { urls: urlData },
    });
    console.log(urldata);
    if (!urlData) {
      res.status(400).json({
        message: "User doesn't exist.",
      });
    } else {
      res.status(200).json({
        message: "Url created",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "error in url fetching",
    });
  }
});
// Selected URL
app.post("/api/v1/fetchOne", jwtProtect, async (req, res, next) => {
  try {
    const userId = req.body.id;
    const url = req.body.url;
    const user = await User.findOne({
      _id: userId,
    });
    const result = user.urls.filter((l) => l.url === url);
    console.log(result);
    if (result) {
      res.status(200).json({
        result,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({
      result: "Error occured",
    });
  }
});
// Get all urls for a User
app.post("/api/v1/fetchAll", async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(500).json({ message: "error in fetching data" });
  }
  res.status(200).json({
    data: user,
  });
});

// Create Custome Path - Required - email,old - oldURl, customepath -
app.put("/api/v1/customeurl", jwtProtect, async (req, res, next) => {
  try {
    const email = req.body.email;
    const customeURL = req.body.customepath;
    const oldLink = req.body.old;
    const custome = `${process.env.SHORT_URL}/${customeURL}`;
    console.log(custome);
    const user = await User.findOne({ email });
    user.urls.map((u) => {
      if (u.url === oldLink) {
        //mconsole.log(u.url);
        const idx = +user.urls.indexOf(u);
        user.urls[idx].set('shrinked', custome)
        user.save().then((result) => {
          res.status(200).json({
            message: "saved",
            object: u,
          });
        });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      message: "Error in custome url conversion",
      err
    })
  }
});
// Get Long URL

// Redirect Shorted URL
app.put("/api/v1/:key", jwtProtect, async (req, res, next) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email });
    const shortUrl = `${process.env.SHORT_URL}/${req.params.key}`;
    const Urldata = await user.urls.shrinked.indexOf(sho);
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
  let password = req.body.password;
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
            link <a href="$${process.env}{process.env.BASE_URL}api/v1/verifyaccount/${token}">${process.env.BASE_URL}api/v1/verifyaccount/${token}</a></p>`,
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
app.get("/api/v1/verifyaccount/:token", async (req, res) => {
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

//  Login 
app.post("/api/v1/login", async (req, res, next) => {
  let fetchData;
  User.findOne({ email: req.body.email }).then((user) => {
    if (!user) {
      return res.status(501).json({
        message: "User doesnot exists",
      });
    }
    fetchData = user;
    let password = req.body.password;
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
          userEmail: fetchData.email,
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
//likes
app.put("api/v1/likes", async (req, res, next) => {
  const urlId = req.body.id;
  const count = +req.body.count;
  const url = await urlData.findByIdAndUpdate(urlId, { likes: count });
  if (url.isModified > 0) {
    res.status(200).json({
      message: "Like updated",
    });
  } else {
    res.status(400).json({
      message: "Error in updates",
    });
  }
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

// Delete Account
app.delete('/api/v1/:userId',jwtProtect, async(req,res,next) => {
  User.deleteOne({_id:req.params.userId})
  .exec()
  .then(result => {
    console.log(result);
    res.status(200).json({
      message: "User deleted"
    });
  })
  .catch(err => {
    console.log(err);
    res.status(500).json({
      error: err
    });
  });
});


module.exports = app;
