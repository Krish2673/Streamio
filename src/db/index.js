import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try{
        const connInstace = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB Connected with host ${connInstace.connection.host}`)
    }
    catch(err) {    
        console.log("MongoDB Connection Failed:", err);
        process.exit(1);
    }
}

export default connectDB;