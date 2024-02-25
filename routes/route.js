require("dotenv").config();

const express = require("express");
const router = express.Router();
const User = require("../models/user");
const UserVerify = require("../models/userVerify");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const userVerify = require("../models/userVerify");

// send mail

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    // user: process.env.AUTH_MAIL,
    // pass: process.env.AUTH_PASS,
  },
});
//  transporter verify

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    // console.log("Server is ready to take messages");
    console.log(success);
  }
});

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/register", (req, res) => {
  res.render("register");
});

//send Verification Email
const sendVerificationEmail = async ({ _id, email, name }, res) => {
  const token = uuidv4() + _id;
  const mailOptions = {
    // from: process.env.AUTH_MAIL,
    to: email, // Use the email parameter
    subject: "Verify your email",
    html: `<h1>Hello ${name}</h1><p>Please click on the link below to verify 
    your email</p><a href="http://localhost:3000/verify/${_id}/${token}">Verify</a>`,
  };
  //   hash the token
  bcrypt.hash(token, 10, async (err, hash) => {
    if (err) {
      console.log(err);
    } else {
      const newVerification = new UserVerify({
        userID: _id,
        uniqueString: hash,
        createdAt: Date.now(),
        expireIn: Date.now() + 3600,
      });
      try {
        await newVerification.save();
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.log(err);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
      } catch (error) {
        console.log(error);
      }
    }
  });
};

//router for register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Please fill all the fields" });
    }

    const isExist = await User.findOne({ email });

    if (isExist) {
      return res.status(400).json({ msg: "Email already exist" });
    }

    const newUser = await User.create({
      name,
      email,
      password,
    });

    // send mail to the new user
    sendVerificationEmail(newUser, res);
    res.status(200).json({
      msg: "User created successfully and email sent successfully",
    });
  } catch (error) {
    console.log(error);
  }
});

// verify email address by sending gmail 
router.get("/verify/:userID/:uniqueString", async (req, res) => {
  const { userID, uniqueString } = req.params;

  try {
    const userVerification = await UserVerify.findOne({ userID });

    if (!userVerification) {
      return res
        .status(400)
        .json({ msg: "Email verification record not found" });
    }

    // Compare the uniqueString with the hashed token
    bcrypt.compare(
      uniqueString,
      userVerification.uniqueString,
      async (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ msg: "Error comparing tokens" });
        }

        if (result) {
          // Check if the verification record has expired

          if (userVerification.createdAt > userVerification.expireIn) {
            return res
              .status(400)
              .json({ msg: "Verification link has expired" });
          }

          // Update the verified status in the User model
          await User.findByIdAndUpdate(userID, { verified: true });
          // delete the user from the userVerify model of that id
          await UserVerify.findOneAndDelete({ userID });

          return res.status(200).json({ msg: "Email verified successfully" });
        } else {
          return res.status(400).json({ msg: "Invalid verification token" });
        }
      }
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/login", (req, res) => {
  res.render("login");
});

// route for login post

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Please fill all the fields" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "Email not found" });
    }
    
    if(!user.verified){
      return res.status(400).json({ msg: "Email not verified" });
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Password not match" });
    }

    const maxAge = 3 * 24 * 60 * 60;

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: maxAge,
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: maxAge * 1000,
    });

    res.status(200).json({
      token,
      user,
    });
  } catch (error) {
    console.log(error);
  }
});

// auth middleware
const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  // check json web token exists & is verified
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect("/login");
      } else {
        // console.log(decodedToken);
        next();
      }
    });
  } else {
    res.redirect("/login");
  }
};

router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
});

router.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard");
});

module.exports = router;
