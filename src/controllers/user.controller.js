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

   console.log("Body: ", req.body);
   console.log("Headers:", req.headers["content-type"]);
   console.log("Files: ", req.files);

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
     
     // console.log("Uploading avatar:", avatarLocalPath);
     const avatar = await uploadOnCloudinary(avatarLocalPath);
     // console.log("Cloudinary response:", avatar);


     // const avatar = await uploadOnCloudinary(avatarLocalPath);               // Upload to Cloudinary
     const coverImage = await uploadOnCloudinary(coverImageLocalPath);

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

    return res.status(200).json(                                                     // return response
        new APIResponse(200, createdUser, "User Registered Successfully!")
    )
})

const loginUser = asyncHandler(async (req,res) => {
     const {username, email, password} = req.body;          // Get User details

     if(!(username || email)) {                             // if(!username && !email)
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

const refreshAccessToken = asyncHandler(async (req,res) => {

     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

     if(!incomingRefreshToken) {
          throw new APIError(401, "Unauthorized Request");
     }

     try{
          const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

          const user = await User.findById(decodedToken?._id);

          if(!user) {
               throw new APIError(401, "Invalid Refresh Token");
          }

          if(incomingRefreshToken !== user.refreshToken) {
               throw new APIError(401, "Refresh Token Mismatch - Invalid or Expired");
          }

          const {accessToken, newRefreshToken} = await generateTokens(user._id);

          const options = {
               httpOnly : true,
               secure : true
          }

          return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
               new APIResponse(200, {
                    accessToken, refreshToken : newRefreshToken
               }, "Access Token Refreshed Successfully")
          )
     }
     catch(err) {
          throw new APIError(401, err?.message || "Invalid Refresh Token");
     }

})

const changePassword = asyncHandler(async (req,res) => {

     const {oldPassword, newPassword} = req.body;

     const user = await User.findById(req.user?._id);

     const isPasswordCorrect = await user.isPasswordValid(oldPassword);

     if(!isPasswordCorrect) {
          throw new APIError(400, "Invalid Old Password");
     }

     user.password = newPassword;
     user.save({validateBeforeSave : true});

     return res.status(200).json(
          new APIResponse(200, {}, "Password Changed Successfully")
     )

})

const getCurrentUser = asyncHandler(async (req,res) => {
     return res.status(200).json(
          new APIResponse(200, req.user, "Current User Fetched Successfully")
     )
})

const updateUserDetails = asyncHandler(async (req,res) => {
     
     const {username, fullName} = req.body;

     if(!username || !fullName) {
          throw new APIError(400, "All fields are required")
     }

     const user = await User.findByIdAndUpdate(req.user?._id, {
          $set : {
               username,
               fullName
          }
     }, {
          new : true
     }).select("-password")

     return res.status(200).json(
          new APIResponse(200, user, "User Details updated Successfully")
     )

})

const updateUserAvatar = asyncHandler(async (req,res) => {

     const avatarLocalPath = req.file?.path;

     if(!avatarLocalPath) {
          throw new APIError(400, "Avatar Image is required");
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath);

     if(!avatar.url) {
          throw new APIError(400, "Avatar Image is required");
     }

     const user = await User.findByIdAndUpdate(req.user?._id, {
          $set : {
               avatar : avatar.url
          }
     }, {
          new : true
     }).select("-password")

     return res.status(200).json(
          new APIResponse(200, user, "User Avatar Updated Successfully")
     )
})

const updateUserCoverImage = asyncHandler(async (req,res) => {

     const coverImageLocalPath = req.file?.path;

     if(!coverImageLocalPath) {
          throw new APIError(400, "Cover Image is required");
     }

     const coverImage = await uploadOnCloudinary(coverImageLocalPath);

     if(!coverImage.url) {
          throw new APIError(400, "Cover Image is required");
     }

     const user = await User.findByIdAndUpdate(req.user?._id, {
          $set : {
               coverImage : coverImage.url
          }
     }, {
          new : true
     }).select("-password")

     return res.status(200).json(
          new APIResponse(200, user, "Cover Image Updated Successfully")
     )
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateUserDetails, updateUserAvatar, updateUserCoverImage};