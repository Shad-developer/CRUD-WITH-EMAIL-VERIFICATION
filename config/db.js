const mongoose = require('mongoose');

const connectDB = async ()=>{
    try {
        mongoose.set('strictQuery', false);
        const conn = mongoose.connect(process.env.MONGODB_URI);
        // console.log("DataBase Connected");
    } catch (error) {
        console.log(error);
    }
}

module.exports = connectDB;