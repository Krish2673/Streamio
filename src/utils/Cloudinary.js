import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath)
            return null;
            // throw new Error("File path is required to upload on Cloudinary");
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })
        console.log("File has been uploaded Successfully on Cloudinary", response.url);
        return response;
        // return response.url;
    }
    catch(err) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export {uploadOnCloudinary}