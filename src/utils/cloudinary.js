import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("file uploaded successfully", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary saved files
    return null;
  }
};

export { uploadOnCloudinary };

// read the docs of cloudinary!!
// In this project, we are not uploading the file directly to cloudinary, instead we are sharing the local file that is accepted through multer and then we are uploading it to cloudinary.
