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


const generateAccessAndRefereshToken = asyncHandler(async (userID) => {
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
});

const loginUser = asyncHandler(async (req, res) => {
  //take out password and email from body
  // check with email or username  if it exists
  // compare password with hashed value
  //access and refresh toeken
  //send cookie

  const { email, username, password } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "username or password is required");
  }

  const user = await User.findOne({
    $or: [{ username, email }],
  });

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
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true, //only can be modified by server
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiError(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user logged in successfully"
      )
    );

  //--------------------------//
});

const logOutUser = asyncHandler(async (req, res) => {



});

export { registerUser, loginUser };
