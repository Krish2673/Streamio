import { APIError } from "../utils/APIError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";


export const verifyJWT = asyncHandler(async (req,_,next) => {

    try{
        const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "");

        if(!token) {
            throw new APIError(401, "Unaythorized Access");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if(!user) {
            throw new APIError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    }
    catch(err) {
        throw new APIError(401, "Unauthorized Access");
    }

})