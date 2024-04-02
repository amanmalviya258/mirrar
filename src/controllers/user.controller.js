import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import emailValidator from "node-email-verifier";

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

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;

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
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registred successfully"));
});

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

  // const user = await User.findOne({
  //   $or: [{ username, email }],
  // }
  // );

  const query = {};
  if (username) {
    query.username = username;
  }

  if (email) {
    query.email = email;
  }
  const user = await User.findOne(query);

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
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        //set is a mongo db operator
        refreshToken: undefined,
      },
    },
    { new: true }
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

//----------------------------------------------------------------------------------
export { registerUser, loginUser, logOutUser };
