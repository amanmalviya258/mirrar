import { Router } from "express";
import {
  publishAVideo,
  updateVideoDetails,
} from "../controllers/video.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/upload").post(
  verifyJWT,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbNail", maxCount: 1 },
  ]),
  publishAVideo
);

router
  .route("/update/:videoId")
  .patch(
    verifyJWT,
    upload.fields([{ name: "thumbNail", maxCount: 1 }]),
    updateVideoDetails
  );

export default router;
