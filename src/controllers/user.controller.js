import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
     // generate access token
     // generate refresh token
     // return them

     try {
          const user = await User.findById(userId);
          const accessToken = user.generateAccessToken();
          const refreshToken = user.generateRefreshToken();
          user.refreshToken = refreshToken;
          await user.save({
               validateBeforeSave: false,
          });

          return { accessToken, refreshToken };
     } catch (error) {
          throw new ApiError(
               500,
               "Something went wrong while generating access and refresh token"
          );
     }
};

// @route POST /api/v1/users/register
const registerUser = asyncHandler(async (req, res) => {
     // get user details from frontend
     // validation  -  not empty
     // check if user already exists : username , email
     //  check for images , check for avatar
     // upload them to couldinary , avatar
     //  create user object - create entry in db
     //  remove password and refresh token field from response
     // check for user creation
     // return res

     const { fullName, email, username, password } = req.body;

     // if (fullName === "") {
     // throw new ApiError(400, "Full Name is required");
     // }

     if (
          [fullName, email, username, password].some(
               (filed) => filed?.trim() === ""
          )
     ) {
          throw new ApiError(400, "All fileds are required");
     }

     const existedUser = User.findOne({
          $or: [{ username }, { email }],
     });

     if (!existedUser) {
          throw new ApiError(409, "User email or username already exists");
     }

     const avatarLocalPath = req.files?.avatar[0]?.path;
     const coverImagesLocalPath = req.files?.coverImage[0]?.path;

     if (!avatarLocalPath) {
          throw new ApiError(400, "Avatar file is required");
     }

     if (!coverImagesLocalPath) {
          throw new ApiError(400, "Cover image file is required");
     }
     const avatar = await uploadOnCloudinary(avatarLocalPath);
     const coverImage = await uploadOnCloudinary(coverImagesLocalPath);

     if (!avatar) {
          throw new ApiError(400, "Avatar file is required");
     }

     if (!coverImage) {
          throw new ApiError(400, "Cover image file is required");
     }

     const user = await User.create({
          fullName,
          email,
          username: username.toLowerCase(),
          password,
          avatar: avatar.url,
          coverImage: coverImage?.url || "",
     });

     const createdUser = await User.findById(user._id)
          .select("-password -refreshToken")
          .lean();

     if (!createdUser) {
          throw new ApiError(500, "Failed to create user");
     }

     return res
          .status(201)
          .json(
               new APiResponse(200, createdUser, "User registered successfully")
          );
});

// @route POST /api/v1/users/login
const loginUser = asyncHandler(async (req, res) => {
     // get user details from frontend
     // validation  -  not empty
     // check if user exists : username , email
     //  check for password
     // create refresh token
     //  remove password field from response
     // return res

     const { email, username, password } = req.body;
     console.log(email, username, password);
     if ([email, username, password].some((filed) => filed?.trim() === "")) {
          throw new ApiError(400, "All fields are required");
     }
     if (!(username || email)) {
          throw new ApiError(400, "Email or username is required");
     }

     const user = await User.findOne({
          $or: [{ username }, { email }],
     });

     if (!user) {
          throw new ApiError(404, "User not found");
     }

     // const isPasswordMatch = await user.isPasswordCorrect(password);

     // if (!isPasswordMatch) {
     //      throw new ApiError(401, "Invalid password");
     // }

     const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
          user._id
     );

     const loggedInUser = await User.findById(user._id).select(
          "-password -refreshToken"
     );

     const options = {
          httpOnly: true,
          secure: true,
     };

     return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", refreshToken, options)
          .json(
               new APiResponse(
                    200,
                    {
                         user: loggedInUser,
                         accessToken,
                         refreshToken,
                    },
                    "User logged in successfully"
               )
          );
});

// @route POST /api/v1/users/logout
const logoutUser = asyncHandler(async (req, res) => {
     // remove access token and refresh token from cookies
     // return res

     await User.findByIdAndUpdate(
          req.user._id,
          {
               $set: {
                    refreshToken: undefined,
               },
          },
          {
               new: true,
          }
     );

     const options = {
          httpOnly: true,
          secure: true,
     };

     return res
          .status(200)
          .clearCookie("accessToken", options)
          .clearCookie("refreshToken", options)
          .json(new APiResponse(200, {}, "User logged out successfully"));
});

// @route POST /api/v1/users/refresh-token
const refreshAccessToken = asyncHandler(async (req, res) => {
     const incomingRefeshToken =
          req.cookie.refreshToken || request.body.refreshToken;

     if (!incomingRefeshToken) {
          throw new ApiError(401, "unauthorized requesr");
     }
     try {
          const decodedToken = jwt.verify(
               incomingRefeshToken,
               process.env.REFRESH_TOKEN_SECRET
          );

          const user = await User.findById(decodedToken?._id);

          if (!user) throw new ApiError(401, "Invalid refresh token");

          if (incomingRefeshToken !== user?.refreshToken) {
               throw new ApiError(401, "Refresh tokrn is expired or used");
          }

          const options = {
               httpOnly: true,
               secure: true,
          };

          const { accessToken, refreshToken } =
               await generateAccessAndRefreshToken(user._id);

          return res
               .status(200)
               .cookie("accessToken", accessToken, options)
               .cookie("refreshToken", refreshToken, options)
               .json(
                    new APiResponse(
                         200,
                         {
                              accessToken,
                              refreshToken,
                         },
                         "Access token refreshed"
                    )
               );
     } catch (error) {
          throw new ApiError(401, error.message || "Failed to refresh token");
     }
});

// @route PUT /api/v1/users/change-password
const changeCurrentPassword = asyncHandler(async (req, res) => {
     const { oldPassword, newPassword } = req.body;

     const user = await User.findById(req?.user?.id);

     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

     if (!isPasswordCorrect) {
          throw new ApiError(401, "Invalid old password");
     }

     user.password = newPassword;
     await user.save({ validateBeforeSave: false });

     return res
          .status(200)
          .json(new APiResponse(200, {}, "Password changed successfully"));
});

// @route GET /api/v1/users/current-user
const getCurrentUser = asyncHandler(async (req, res) => {
     return res
          .status(200)
          .json(200, req.user, "Current User featched successfully");
});

// @route PUT /api/v1/users/upload-avatar
const updateAccountDetails = asyncHandler(async (req, res) => {
     const { fullName, email, username } = req.body;
     const user = await User.findByIdAndUpdate(
          req.user._id,
          { $set: { fullName, email, username: username.toLowerCase() } },
          { new: true }
     ).select("-password");

     return res
          .status(200)
          .json(
               new APiResponse(
                    200,
                    user,
                    "Account details updated successfully"
               )
          );
});

//NOTE: if user change any file . the best practice is create a new controller .
// @route PUT /api/v1/users/update-avatar-image
const updateUserAvatar = asyncHandler(async (req, res) => {
     const avatarLocalPath = req.files?.coverImage[0]?.path;
     if (!avatarLocalPath) {
          throw new ApiError(400, "Avatar is missing");
     }
     const avatar = await uploadOnCloudinary(avatarLocalPath);
     if (!avatar.url) {
          throw new ApiError(400, "Error while uploading on avatar ");
     }

     const user = await User.findByIdAndUpdate(
          req.user._id,
          { $set: { avatar: avatar.url } },
          { new: true }
     ).select("-password");

     return res
          .status(200)
          .json(new APiResponse(200, user, "avatar  updated successfully"));
});

// @route PUT /api/v1/users/update-cover-image
const updateUserCoverImages = asyncHandler(async (req, res) => {
     const coverImagesLocalPath = req.files?.coverImage[0]?.path;
     if (!coverImagesLocalPath) {
          throw new ApiError(400, "cover images is missing");
     }
     const coverImage = await uploadOnCloudinary(coverImagesLocalPath);
     if (!coverImage.url) {
          throw new ApiError(400, "Error while uploading on cover images ");
     }

     const user = await User.findByIdAndUpdate(
          req.user._id,
          { $set: { ConverImage: coverImage.url } },
          { new: true }
     ).select("-password");

     return res
          .status(200)
          .json(new APiResponse(200, user, "Cover image updated successfully"));
});

// @route PUT /api/v1/users/update-cover-image

const getUserChannelProfile = asyncHandler(async (req, res) => {
     const { username } = req.params;

     if (!username?.trim()) {
          throw new ApiError(400, "Username is a missing");
     }

     try {
          const channel = await User.aggregate([
               {
                    $match: {
                         username: username?.toLowerCase(),
                    },
               },
               {
                    $lookup: {
                         from: "Subscription",
                         foreignField: "channel",
                         localField: "_id",
                         as: "subscribers",
                    },
               },
               {
                    $lookup: {
                         from: "Subscription",
                         foreignField: "subscriber",
                         localField: "_id",
                         as: "subscribedTo",
                    },
               },
               {
                    $addFields: {
                         subscribersCount: {
                              $size: "$subscribedTo",
                         },
                         channelSubscribedToCount: {
                              $size: "$subscribedTo",
                         },
                    },

                    isSubscribed: {
                         $cond: {
                              if: {
                                   $in: [
                                        req.user?._id,
                                        "$subscribers.subscriber",
                                   ],
                              },
                              then: true,
                              else: false,
                         },
                    },
               },
               {
                    $project: {
                         fullName: 1,
                         username: 1,
                         subscribersCount: 1,
                         channelSubscribedToCount: 1,
                         isSubscribed: 1,
                         avatar: 1,
                         coverImage: 1,
                         email: 1,
                    },
               },
          ]);

          console.log(channel);

          if (!channel?.length) {
               throw new ApiError(404, "channel not found");
          }
          res.status(200).json(
               new APiResponse(
                    200,
                    channel[0],
                    "Channel profile fetched successfully"
               )
          );
     } catch (error) {
          throw new ApiError(500, "channel server error");
     }
});

const getWatchHistory = asyncHandler(async (req, res) => {
     const user = await User.aggregate([
          {
               $match: {
                    _id: mongoose.Types.ObjectId(req.user._id),
               },
               $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                         {
                              $lookup: {
                                   from: "users",
                                   localField: "owner",
                                   foreignField: "_id",
                                   as: "owner",
                                   pipeline: [
                                        {
                                             $project: {
                                                  fullName: 1,
                                                  username: 1,
                                                  avatar: 1,
                                             },
                                        },
                                   ],
                              },
                         },
                         {
                              $addFields: {
                                   owner: {
                                        $first: "$owner",
                                   },
                              },
                         },
                    ],
               },
          },
     ]);

     if (!user?.length) {
          throw new ApiError(404, "User not found");
     }
     return res
          .status(200)
          .json(
               new APiResponse(
                    200,
                    user[0].watchHistory,
                    "Watch history fatched successfully"
               )
          );
});
export {
     registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateUserAvatar, 
     updateAccountDetails,
     updateUserCoverImages,
     getUserChannelProfile,
     getWatchHistory,
};
