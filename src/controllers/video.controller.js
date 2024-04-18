import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { isValidObjectId } from "mongoose";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, shortBy, shortType, userId } = req.query;
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );
  if (
    [title, description].some((fields) => {
      fields?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const videoLocalPath = req.files?.videoFile[0].path;
  //console.log(videoLocalPath)
  const thumbnailLocalPath = req.files?.thumbNail[0].path;
  if (!videoLocalPath) {
    throw new ApiError(400, "video is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required");
  }

  const options = {
    media_metadata: true,
  };

  const videoUpload = await uploadOnCloudinary(videoLocalPath, options);

  if (!videoUpload) {
    throw new ApiError(401, "Error while uploading video on cloudinary");
  }
  const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnailUpload) {
    throw new ApiError(401, "thumbnail uploading failed on cloudinary");
  }
  const video = await Video.create({
    videoFile: videoUpload.url,
    owner: user._id,
    title,
    description,
    thumbnail: thumbnailUpload.url,
    duration: videoUpload.duration,
  });
  //console.log("videoUpload", videoUpload);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "User Video Uploaded successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const newThumbNailLocalPath = req.files?.thumbNail[0]?.path;
  //  console.log( newThumbNailLocalPath)
  // console.log("videoID:" , videoId)
  if (!title || !description) {
    throw new ApiError(400, "title or description is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video not found");
  }

  const previousVideo = await Video.findById(videoId);
  //console.log(previousVideo);
  const deletingThumbNail = await deleteOnCloudinary(previousVideo.thumbnail);

  if (!deletingThumbNail) {
    throw new ApiError(401, "uploading media to cloudinary failed");
  }

  const uploadNewThumbNail = await uploadOnCloudinary(newThumbNailLocalPath);

  if (!uploadNewThumbNail) {
    throw new ApiError(401, "deleting media from cloudinary failed");
  }
  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title,
        descriptiown: description,
        thumbnail: uploadNewThumbNail.url,
      },
    },
    { new: true }
  );

  if (!video) {
    throw new ApiError(400, "updating details to mongoDB failed");
  }
  res
    .status(200)
    .json(new ApiResponse(200, video, "video details updated successfully"));
});

export { publishAVideo, getAllVideos, updateVideoDetails };
