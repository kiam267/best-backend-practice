import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
     {
          username: {
               type: String,
               required: true,
               unique: true,
               lowecase: true,
               trim: true,
               index: true,
          },
          email: {
               type: String,
               required: true,
               unique: true,
               lowecase: true,
               trim: true,
          },
          fullName: {
               type: String,
               required: true,
               trim: true,
               index: true,
          },
          avatar: {
               type: String,
               required: true,
          },
          coverImage: {
               type: String,
          },
          watchHistory: [
               {
                    type: Schema.Types.ObjectId,
                    ref: "Video",
               },
          ],
          password: {
               type: String,
               required: [true, "Password is required"],
               minlength: 8,
               select: false,
          },
          refreshToken: {
               type: String,
          },
     },
     {
          timestamps: true,
     }
);

userSchema.pre("save", async function (next) {
     if (!this.isMondified("password")) return next();
     this.password = bcrypt.hash(this.password, 10);
     next();
});

userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
     const isMatch = await bcrypt.compare(candidatePassword, this.password);
     return isMatch;
};

userSchema.methods.generateAccessToken = function () {
     return jwt.sign(
          {
               _id: this._id,
               email: this.email,
               username: this.username,
               fullName: this.fullName,
          },
          process.env.ACCESS_TOKEN_SECRET,
          {
               expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
          }
     );
};

userSchema.methods.generateRefreshToken = function () {
     return jwt.sign(
          {
               _id: this._id,
          },
          process.env.REFRESH_TOKEN_SECRET,
          {
               expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
          }
     );
};

export const User = mongoose.model("User", userSchema);
