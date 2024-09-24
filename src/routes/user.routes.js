import { Router } from "express";
import Jwt from "jsonwebtoken";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImg,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Custom middleware to optionally verify JWT
const optionalVerifyJWT = (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  console.log("Token", token);
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

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImg", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
  .route("/change-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-coverImg")
  .patch(verifyJWT, upload.single("coverImg"), updateUserCoverImg);
// router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/c/:username").get(optionalVerifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;

// The name we gave to multer file here, should be same in frontend form too.
