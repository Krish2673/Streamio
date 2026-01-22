import {asyncHandler} from "../utils/asyncHandler.js";
import {APIError} from "../utils/APIError.js"
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { APIResponse } from "../utils/APIResponse.js"; 

const generateTokens = async (Userid) => {
     try {
          const user = await User.findById(Userid);
     
          const accessToken = user.generateAccessToken();
          const refreshToken = user.generateRefreshToken();

          user.refreshToken = refreshToken;
          await user.save({validateBeforeSave : false});

          return {accessToken, refreshToken};
     }
     catch(err) {
          throw new APIError(500, "Error Generating Tokens");
     }
}

const registerUser = asyncHandler(async (req,res) => {
    
   const {username, email, fullName, password} = req.body;            // Get User details
   console.log("Email: ", email); 

   if ([username, email, fullName, password].some((field) => field?.trim() === "")) {          // Validation
        throw new APIError(400, "All fields are required");
   }

   if(await User.findOne({ $or : [{username}, {email}]})) {                      // Check if User already exists
        throw new APIError(409,"Username or Email already exists");
   }

//    console.log("Files: ", req.files);

   const avatarLocalPath = req.files?.avatar[0]?.path;                      // Handle File Upload (Images)
//    let coverImageLocalPath = null;
//    if(req.files?.coverImage?.length > 0) {
//           coverImageLocalPath = req.files.coverImage[0].path;
//      }
     //    const coverImageLocalPath = req.files?.coverImage[0]?.path;
     
   const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

     if(!avatarLocalPath) {
          throw new APIError(400, "Avatar is Required");
     }
     
     const avatar = await uploadOnCloudinary(avatarLocalPath);               // Upload to Cloudinary
     const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

   if(!avatar) {
        throw new APIError(500, "Error in uploading Avatar");
   }

    const user = await User.create({                        // Create User - create entry in DB
        username,
        email,
        fullName,
        password, 
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");       // Fetch created User without sensitive info

    if(!createdUser) {                                                     // Check if User created successfully
        throw new APIError(500, "Error in Registering User");
    }

    return res.status(201).json(                                                     // return response
        new APIResponse(200, createdUser, "User Registered Successfully!")
    )
})

const loginUser = asyncHandler(async (req,res) => {
     const {username, email, password} = req.body;          // Get User details

     if(!(username || email)) {
          throw new APIError(400, "Username or Email is required");
     }

     const user = await User.findOne({                      // check if User exists
          $or : [{username}, {email}]
     })

     if(!user) {
          throw new APIError(404, "User does not exist");
     }

     const isPswdValid = await user.isPasswordValid(password)

     if(!isPswdValid) {                       // Validate Password
          throw new APIError(401, "Incorrect Password");
     }

     const {accessToken, refreshToken} = await generateTokens(user._id);        // Generate Tokens

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

     const options = {                       // Send Tokens in HttpOnly Cookies
          httpOnly : true,
          secure : true
     }

     return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
          new APIResponse(200, {
               user : loggedInUser, accessToken, refreshToken
          }, "User Logged In Sucessfully!")
     )

})

const logoutUser = asyncHandler(async (req,res) => {

     await User.findByIdAndUpdate(req.user._id, {
          $set : {
               refreshToken : undefined
          }},
          {
               new : true
          }
     )

     const options = {
          httpOnly : true,
          secure : true
     }
     
     return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
          new APIResponse(200, {}, "User Logged Out Successfully")
     )

})

export {registerUser, loginUser, logoutUser};