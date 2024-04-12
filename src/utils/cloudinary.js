import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return error("file not found Cloudinary");
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfull
    //  console.log("file is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    console.log(response);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const deleteOnCloudinary = async (cloudinaryOldUrl) => {
  try {
    if (!cloudinaryOldUrl) {
      throw new ApiError(400, "old media url not found");
    }
    const mediaDestroyer = await cloudinary.uploader
      .destroy(cloudinaryOldUrl, { resource_type: "image" })
      .then((result) => {
        console.log(result);
      });
    if (!mediaDestroyer) {
      throw new ApiError(400, "media not destroyed");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, mediaDestroyer, "deleted successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "media deleting failed from cloudinary"
    );
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
