import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _ , next) => {
  //response is not used hence underscored
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); //using bearer because client can be mobile version
    //hearder mai authorization field hoti h jisme bearer keyword followed by token hota h
    //toh idhar we're replacing the bearer keyword to get only token

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); //decoding the token

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "invalid access token");
    }

    req.user = user;
    
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
