import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!(videoId && content)) {
    throw new ApiError(400, "videoId or content is not available");
  }

  const video = await Video.findById(videoId);

  if (video) {
    throw new ApiError(400, "Video not found");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(400, "Failed to add comment to DB");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully"));

  // This need testing rn
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
});

export { getVideoComments, addComment, updateComment, deleteComment };
