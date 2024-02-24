const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userVerifySchema = mongoose.Schema({
  userID: {
    type: String,
  },
  uniqueString: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
  expireIn: {
    type: Date,
  } 
});


module.exports = mongoose.model("UserVerify", userVerifySchema);
