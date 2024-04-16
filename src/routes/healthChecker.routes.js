import { Router } from "express";
import { healthChecker } from "../controllers/healthcheck.controller.js";

const router = Router();

router.route("/healthCheck").get(healthChecker)

export default router;