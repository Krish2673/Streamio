import {asyncHandler} from "../utils/asyncHandler.js";
import {APIError} from "../utils/APIError.js"
import User from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { APIResponse } from "../utils/APIResponse.js"; 

const registerUser = asyncHandler(async (req,res) => {
    
   const {username, email, fullName, password} = req.body;
   console.log("Email: ", email); 

   if ([username, email, fullName, password].some((field) => field?.trim() === "")) {
        throw new APIError(400, "All fields are required");
   }

   if(User.findOne({ $or : [{username}, {email}]})) {
        throw new APIError(409,"Username or Email already exists");
   }

   const avatarLocalPath = req.files?.avatar[0]?.path
   const coverImageLocalPath = req.files?.coverImage[0]?.path

   if(!avatarLocalPath) {
        throw new APIError(400, "Avatar is Required");
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   if(!avatar) {
        throw new APIError(500, "Error in uploading Avatar");
   }

    const user = await User.create({
        username,
        email,
        fullName,
        password, 
        avatar : avatar.url, 
        coverImage : coverImage?.url
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser) {
        throw new APIError(500, "Error in Registering User");
    }

    return res.status(201).json(
        new APIResponse(200, createdUser, "User Registered Successfully!")
    )
})

export {registerUser};