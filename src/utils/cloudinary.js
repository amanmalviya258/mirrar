import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { extractPublicId } from "cloudinary-build-url";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    const options = {
      unique_filename: true,
      resource_type: "image",
      folder: "videoStreamingAssets",
    };

    if (!localFilePath) return error("file not found Cloudinary");
    // console.log(localFilePath)
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, options);
    console.log("cloudinary response", response);
    // file has been uploaded successfull
    //  console.log("file is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    //console.log(response);

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
    const publicId = extractPublicId(cloudinaryOldUrl);
    console.log("publicID", publicId);

    const mediaDestroyer = await cloudinary.uploader
      .destroy(publicId)
      .then((result) => {
        console.log(result);
      });
    return new ApiResponse(
      200,
      mediaDestroyer,
      "old media destroyed successfully from cloudinary"
    );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "media deleting failed from cloudinary"
    );
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
