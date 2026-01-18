// import express from "express"
// import mongoose from "mongoose"
// import {DB_NAME} from "./constants.js"
import connectDB from "./db/index.js";
import dotenv from 'dotenv'

dotenv.config({ path: './.env' });

connectDB();


// const app = express()

/*
;( async () => {
    try {
        mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        app.on("error", (err) => {
            console.log("Error:", err);
            throw err;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on PORT: ${process.env.PORT}`);
        })
    }
    catch(err) {
        console.error("Error connecting to Database:", err)
        throw err;
    }
})()*/