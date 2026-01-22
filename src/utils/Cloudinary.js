import {v2 as cloudinary} from "cloudinary"
import fs, { existsSync } from "fs"
import path from "path";
import dotenv from "dotenv";

dotenv.config()

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localFilePath) => {
    if(!localFilePath)
        return null;
        // throw new Error("File path is required to upload on Cloudinary");

    const absolutePath = path.resolve(localFilePath);
    
    try {
        const response = await cloudinary.uploader.upload(absolutePath, {
            resource_type : "auto"
        });
        // console.log("File has been uploaded Successfully on Cloudinary", response.url);
        if(fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
        return response;
        // return response.url;
    }
    catch(err) {
        // console.error("🔥 Cloudinary ERROR FULL:", err);
        if(fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
        // if (localFilePath && fs.existsSync(localFilePath)) {
        // }
        return null;
    }
}

export {uploadOnCloudinary}