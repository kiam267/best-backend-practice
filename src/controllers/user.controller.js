import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

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

const refreshToken = asyncHandler(async (req, res) => {

     const incomingRefeshToken = req.cookie.refreshToken || request.body.refreshToken;

     if (incomingRefeshToken) {
          throw new ApiError(401, "unauthorized requesr");
     }


     jwt.verify(incomingRefeshToken);
});


export { registerUser, loginUser, logoutUser };
