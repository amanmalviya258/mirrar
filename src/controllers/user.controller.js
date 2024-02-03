import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get users details from frontend
  //validation- not empty
  //check it user already exists
  //if profile pic upload to cloudinary
  // create user object - creation call
  // remove password and referesh token field from response
  // check for user creation
  // response return

  const { username, email, fullName, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //const profilePicLocalPath = req.files?.profilePic[0]?.path;

  let profilePicLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.profilePic) &&
    req.files.profilePic.length > 0
  ) {
    profilePicLocalPath = req.files.profilePic[0].path;
  }

  //   if (!profilePicLocalPath) {
  //     throw new ApiError(400, "ProfilePic file is required");
  //   }

  const profilePic = await uploadOnCloudinary(profilePicLocalPath);

  //   if (!profilePic) {
  //     throw new ApiError(400 , "ProfilePic file is required")
  //   }

  const user = await User.create({
    fullName,
    profilePic: profilePic?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating a user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registred successfully"));
});

export { registerUser };
