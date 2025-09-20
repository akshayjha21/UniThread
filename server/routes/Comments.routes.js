import express from "express"
import {
    createComment,
    getPostComment,
    getUserComment,
    deleteComment,
    updateComment
} from "../controllers/Comment.controller.js"
const router = express.Router();
import { verifyToken, optionallyVerifyToken } from "../middlewares/auth.js"

router.patch("/:id", verifyToken,updateComment);
router.post("/:id", verifyToken,createComment);
router.delete("/:id", verifyToken,deleteComment);
router.get("/post/:id",getPostComment);
router.get("/user/:id",getUserComment);

export default router;