import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const MAX_RETRIES = 3;

const uploadOnCloudinary = async (localFilePath) => {
  let retryCount = 0;
  let response = null;

  while (retryCount < MAX_RETRIES) {
    try {
      if (!localFilePath) {
        throw new Error("Local file path is missing");
      }

      response = await cloudinary.uploader.upload(localFilePath);
      console.log("File uploaded successfully", response.url);
      fs.unlinkSync(localFilePath);
      break; // Exit the loop if upload is successful
    } catch (error) {
      console.error("File upload failed from Cloudinary", error.message);

      retryCount++;
      console.log(`Retrying upload... Retry count: ${retryCount}`);

      // Wait for a short period before retrying (e.g., 1 second)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (retryCount === MAX_RETRIES) {
    console.error("Max retries exceeded. Upload failed.");
    fs.unlinkSync(localFilePath); // Delete the file after max retries are reached
    return null;
  }

  return response;
};

const deleteOnCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    console.log("File deleted successfully", response);
    return response;
  } catch (error) {
    console.log("File deletion failed");
  }
};
export { uploadOnCloudinary, deleteOnCloudinary };

// read the docs of cloudinary!!
// In this project, we are not uploading the file directly to cloudinary, instead we are sharing the local file that is accepted through multer and then we are uploading it to cloudinary.
