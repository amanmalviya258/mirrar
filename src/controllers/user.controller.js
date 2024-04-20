import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import emailValidator from "node-email-verifier";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefereshToken = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};
//----------------------------------------------------
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;
  // console.log("body", req.body);
  //console.log("files", req.files);
  if (
    [fullName, email, username, password].some(
      (field) => field?.trim() === "" || !field
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const isEmail = await emailValidator(email);
  if (!isEmail) {
    throw new ApiError(400, "enter a valid email address");
  }

  const existedname = await User.findOne({ username });
  if (existedname) {
    throw new ApiError(409, "User with username already exists");
  }
  const existedemail = await User.findOne({ email });
  if (existedemail) {
    throw new ApiError(409, "User with email exists");
  }

  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files?.avatar) &&
    req.files?.avatar.length > 0
  ) {
    avatarLocalPath = req.files?.avatar[0]?.path;
  } else {
    throw new ApiError(409, "Avatar not found");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  let coverImageLocalPath;

  if (
    req.files?.coverImage?.length > 0 &&
    req.files &&
    Array.isArray(req?.files?.coverImage)
  ) {
    coverImageLocalPath = req.files.coverImage[0]?.path;
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  const user = await User.create({
    fullName,
    avatar: avatar?.url,
    email,
    password,
    username: username.toLowerCase(),
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id) //checking if user is created!
    .select(
      "-password -refreshToken" //it removes password and refreshToken field
      //syntax is in string
    );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating a user");
  }

  return res
    .status(201) //this .status is better way to give status code so we're giving status code this way and also with the json object
    .json(new ApiResponse(200, createdUser, "user registred successfully"));
});

//----------------------------------------------------
const loginUser = asyncHandler(async (req, res) => {
  //take out password and email from body
  // check with email or username  if it exists
  // compare password with hashed value
  //access and refresh toeken
  //send cookie

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  //console.log("user" , user)

  //console.log(user.username);
  if (!user) {
    throw new ApiError(404, "user not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken " //idhar refresh token empty hai ky
  );

  //console.log(loggedInUser)
  const options = {
    httpOnly: true,
    secure: true, //only can be modified by server
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken }, //sending access token and refresh token again in case the front-end is a mobile
        "user logged in successfully"
      )
    );
});

//----------------------------------------------------
const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        //unset is a mongo db operator
        refreshToken: 1, //this remove the field from document
      },
    },
    { new: true } //return the modified document rather than the original
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "UserLogged Out successfully"));
});

//----------------------------------------------------
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body?.refreshToken;
  //console.log("incoming refresh token", incomingRefreshToken);

  if (!incomingRefreshToken) {
    throw new ApiError(401, "incoming cookie not found");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (!decodedToken) {
      throw new ApiError(401, "unauthorized request");
    }
    // console.log("decoded Token",decodedToken?._id)
    const user = await user.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    console.log("user", user);

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(
        401,
        "Referesh token is expired or used , login again for generating a refreshToken"
      );
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access and refreshToken re-freshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

//----------------------------------------------------
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmNewPassword) {
    throw new ApiError(400, "either of the field is empty");
  }

  if (oldPassword == newPassword) {
    throw new ApiError(400, "old and new password is same");
  }

  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, "new password and confirm password is diferent");
  }
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

//----------------------------------------------------
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "user fetched successfully"));
});

//----------------------------------------------------
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;
  if (!fullName && !email && !username) {
    throw new ApiError(401, "any field not provided");
  }

  if (fullName) {
    const lenghthChecker = fullName.length;
    if (lenghthChecker.length < 2) {
      throw new ApiError(401, "enter a valid name");
    }
  }

  if (email) {
    const existedEmail = await User.findOne({ email });
    if (existedEmail) {
      throw new ApiError(401, "email already existed");
    }

    const isEmail = await emailValidator(email);
    if (!isEmail) {
      throw new ApiError(400, "enter a valid email address");
    }
  }

  if (username) {
    const existedUsername = await User.findOne({ username });
    if (existedUsername) {
      throw new ApiError(401, "username already existed");
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        username,
      },
    },
    { new: true }
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//----------------------------------------------------
const updateUserAvatar = asyncHandler(async (req, res) => {
  const { resourceType } = req.params;
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  const user = await User.findById(req.user?._id).select("-password");

  const previousUserAvatar = user?.avatar;

  const deleteMedia = await deleteOnCloudinary(
    previousUserAvatar,
    resourceType
  );
  if (!deleteMedia) {
    throw new ApiError(400, "deleting image from cloudinary failed");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  user.avatar = avatar.url;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Avatar updated successfully"));
});

//----------------------------------------------------
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  const { resourceType } = req.params;
  //console.log(coverImageLocalPath)
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover file is missing");
  }

  const user = await User.findById(req.user?._id).select("-password");

  const previousUserCoverImage = user?.coverImage;

  const deleteMedia = await deleteOnCloudinary(
    previousUserCoverImage,
    resourceType
  );
  if (!deleteMedia) {
    throw new ApiError(400, "deleting image from cloudinary failed");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on coverImage");
  }
  user.coverImage = coverImage.url;
  await user.save();
  return res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "User coverImage updated successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }
  const channel = await User.aggregate([
    //this is a left join aggregation pipeline
    //------------------------------------------
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    //This Filters users based on the lowercase version of the provided username.
    //---------------------------------------------------------------

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    //This Performs a 'join' like operation with the "subscriptions" collection. It finds subscriptions where the current user is the 'channel'. This gets subscribers
    //------------------------------------------------
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    //Another 'join', finding subscriptions where the current user is the 'subscriber'. This gets subscribedTo.
    //----------------------------------------
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    //Adds new calculated fields:
    //subscribersCount: Size of the subscribers array (subscriber count).
    //channelsSubscribedToCount: Size of the subscribedTo array.
    //isSubscribed: Checks if the requesting user (req.user._id) is within the subscribers array.
    //---------------------------------------------
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        isSubscribed: 1,
        createdAt: 1,
      },
    },
    //Selects which fields to include in the final result, shaping the output.
    //------------------------------------------------
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel not exist");
  }
  console.log("channel", channel);

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "user channel fetched sucessfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id), // req.user._id -> this will not work  since we not only need the  numbers part in _id but instead we neead the full ObjectId('fwert433436sdwf235')
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistroy",
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

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch histroy fetched successfully"
      )
    );
});

//---------------------------------------------------------------------
export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
