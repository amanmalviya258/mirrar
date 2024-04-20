import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { isValidObjectId } from "mongoose";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";


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
  const { videoId, resourceType } = req.params;
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

  const userId = req.user._id;
  if (JSON.stringify(userId) !== JSON.stringify(previousVideo.owner)) {
    throw new ApiError(401, "unauthorized video");
  }
  const deletingThumbNail = await deleteOnCloudinary(
    previousVideo.thumbnail,
    resourceType
  );

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
  return res
    .status(200)
    .json(new ApiResponse(200, video, "video details updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId, resourceType1, resourceType2 } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is wrong");
  }

  const user = req.user._id;
  //console.log(user);
  const video = await Video.findById(videoId);
  // console.log(video.owner);

  if (JSON.stringify(user) !== JSON.stringify(video.owner)) {
    throw new ApiError(400, "unauthorizied operation performed");
  }

  const deletingVideo = await deleteOnCloudinary(
    video.videoFile,
    resourceType1
  );
  //console.log(deletingVideo);

  if (!deletingVideo) {
    throw new ApiError(400, "deleting video failed");
  }
  const deletingThumbNail = await deleteOnCloudinary(
    video.thumbnail,
    resourceType2
  );

  if (!deletingThumbNail) {
    throw new ApiError(400, "deleting thumbnail failed");
  }

  const deletingVideoCollection = await Video.findByIdAndDelete(videoId);
  if (!deletingVideoCollection) {
    throw new ApiError(400, " deleting video Collection failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "video collection deleted successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "incorrect videoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "video not found");
  }
  console.log(video);
  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is incorrect");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(200, "video doesn't exists");
  }
  const user = req.user._id;
  //console.log(user);
  // console.log(video.owner);
  if (JSON.stringify(user) !== JSON.stringify(video.owner)) {
    throw new ApiError(400, "unauthorizied operation performed");
  }

  const isPublishedVideo = video.isPublished;
  if (isPublishedVideo) {
    video.isPublished = false;
  }
  if (!isPublishedVideo) {
    video.isPublished = true;
  }
  const updatedVideo = await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "video unpublished"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const query = req.query.query || "";
  const shortBy = req.query.shortBy;
  const shortType = req.query.shortType;
  const userId = req.query.userId;


  
});

export {
  publishAVideo,
  updateVideoDetails,
  deleteVideo,
  getVideoById,
  togglePublishStatus,
  getAllVideos,
};
