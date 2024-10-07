import jwt from "jsonwebtoken";

import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
     // verify JWT token and attach user to req.user
     // If token is invalid or expired, send 401 Unauthorized response
     const token =
          req.cookies?.accessToken ||
          req.header("Authorization")?.replace("Bearer ", "");

     if (!token) {
          throw new ApiError(401, "Unauthorized request");
     }
     
     try {
          const decodedToken = jwt.verify(
               token,
               process.env.ACCESS_TOKEN_SECRET
          );

          const user = await User.findById(decodedToken?._id).select(
               "-password -refreshToken"
          );

          if (!user) {
               throw new ApiError(401, "Invalid Access Token");
          }

          req.user = user;
          next();
     } catch (error) {
          throw new ApiError(401, error?.message || "Invalid Access Token");
     }
});
