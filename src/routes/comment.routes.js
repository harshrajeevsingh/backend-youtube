import { Router } from "express";
import Jwt from "jsonwebtoken";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

const optionalVerifyJWT = (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = decodedToken;
    } catch (error) {
      // Token is invalid, but we'll continue without setting req.user
    }
  }
  next();
};

// Apply verifyJWT middleware to all routes in this file
// router.use(verifyJWT);

router
  .route("/:videoId")
  .get(optionalVerifyJWT, getVideoComments)
  .post(verifyJWT, addComment);
router
  .route("/c/:commentId")
  .delete(verifyJWT, deleteComment)
  .patch(verifyJWT, updateComment);

export default router;
