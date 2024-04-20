import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideoDetails,
} from "../controllers/video.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//unsecure routes
router.route("/getVideo/:videoId").get(getVideoById);
router.route("/").get(getAllVideos)

//secure routes
router.route("/upload").post(
  verifyJWT,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbNail", maxCount: 1 },
  ]),
  publishAVideo
);

router
  .route("/update/:videoId/:resourceType")
  .patch(
    verifyJWT,
    upload.fields([{ name: "thumbNail", maxCount: 1 }]),
    updateVideoDetails
  );

router
  .route("/delete/:videoId/:resourceType1/:resourceType2")
  .delete(verifyJWT, deleteVideo);

router.route("/togglePublishStatus/:videoId").patch(verifyJWT , togglePublishStatus)


export default router;
