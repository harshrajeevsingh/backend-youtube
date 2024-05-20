import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Tweet } from "../models/tweet.models.js";
import { Like } from "../models/like.models.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  console.log(userId);
  const pipeline = [];

  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"],
        },
      },
    });
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  pipeline.push({ $match: { isPublished: true } });

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } }); // "-1" = ascending & "1" = descending
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    }
  );

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (
    !title ||
    !description ||
    [title, description].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "Title and Description are required");
  }

  let videoFileLocalPath;
  let thumbnailFileLocalPath;

  if (!(req.files && req.files.videoFile && req.files.videoFile.length > 0)) {
    throw new ApiError(400, "Video file is missing");
  } else {
    videoFileLocalPath = req.files.videoFile[0].path;
  }

  if (!(req.files && req.files.thumbnail && req.files.thumbnail.length > 0)) {
    throw new ApiError(400, "Thumbnail file is missing");
  } else {
    thumbnailFileLocalPath = req.files.thumbnail[0].path;
  }

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video File file is required");
  }

  if (!thumbnailFileLocalPath) {
    throw new ApiError(400, "Thumbnail File file is required");
  }

  const uploadedVideo = await uploadOnCloudinary(videoFileLocalPath);
  const uploadedThumbnail = await uploadOnCloudinary(thumbnailFileLocalPath);

  if (!uploadedVideo) {
    throw new ApiError(400, "Video couldn't be uploaded or not available");
  }

  if (!uploadedThumbnail) {
    throw new ApiError(400, "thumbnail couldn't be uploaded or not available");
  }

  const video = await Video.create({
    title,
    description,
    duration: uploadedVideo.duration,
    videoFile: {
      url: uploadedVideo.url,
      public_id: uploadedVideo.public_id,
    },
    thumbnail: {
      url: uploadedThumbnail.url,
      public_id: uploadedThumbnail.public_id,
    },
    owner: req.user?._id,
    isPublished: true,
  });

  const videoUploaded = await Video.findById(video._id);

  if (!videoUploaded) {
    throw new ApiError(400, "Video couldn't be updated in DB");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video data fetched successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const videoDetails = await Video.aggregate([
    // Match the video by ID
    {
      $match: { _id: new mongoose.Types.ObjectId(videoId) },
    },
    // Lookup likes for the video
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    // Lookup owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    // Add additional fields
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        ownerDetails: { $arrayElemAt: ["$ownerDetails", 0] },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // Final Projection with only necessary fields
    {
      $project: {
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        ownerDetails: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!videoDetails || videoDetails.length === 0) {
    throw new ApiError(404, "Video not found");
  }

  // Increment the view count
  await Video.findByIdAndUpdate(videoId, {
    $inc: { views: 1 },
  });

  // Update watch history if the user is logged in
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { watchHistory: videoId },
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoDetails[0],
        "Video details fetched successfully"
      )
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is invalid");
  }

  if (!(title && description)) {
    throw new ApiError(400, "Title & Description is required");
  }

  let thumbnailFileLocalPath;
  if (!(req.file && req.file.path)) {
    throw new ApiError(400, "Thumbnail file is missing");
  } else {
    thumbnailFileLocalPath = req.file.path;
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "Only owner can delete the video");
  }

  const uploadedThumbnail = await uploadOnCloudinary(thumbnailFileLocalPath);

  const thumbnailToDelete = video.thumbnail.public_id;

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          url: uploadedThumbnail.url,
          public_id: uploadedThumbnail.public_id,
        },
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(400, "Failed to update the video");
  }

  if (thumbnailToDelete) {
    await deleteOnCloudinary(thumbnailToDelete);
  }

  return res.status(200).json(200, updatedVideo, "Video updated successfully");
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video can't be found to delete");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Only owner can delete the video");
  }

  const deletedVideo = await Video.findByIdAndDelete(video._id);

  if (!deletedVideo) {
    throw new ApiError(400, "The video can't be deleted");
  }

  await deleteOnCloudinary(video.thumbnail.public_id);
  await deleteOnCloudinary(video.videoFile.public_id, "video");

  await Like.deleteMany({
    video: videoId,
  });

  await Comment.deleteMany({
    video: videoId,
  });

  return res.status(200).json(new ApiResponse(200, "Video is deleted"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Only owner can delete the video");
  }

  const toggledVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!toggledVideoPublish) {
    throw new ApiError(400, "Failed to change publish status");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videoPublishStatus: toggledVideoPublish.isPublished },
        "Video's Piblish status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
