import express from "express"
import {getPost,
  getPosts,
  createPost,
  createPostwithImg,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getUserLikes,
  getUserLikedPosts} from "../controllers/Post.controller.js"
const router = express.Router();
import { verifyToken, optionallyVerifyToken } from "../middlewares/auth.js"

router.get("/", optionallyVerifyToken,getPosts);
router.post("/", verifyToken,createPost);

router.get("/:id", optionallyVerifyToken,getPost);
router.patch("/:id", verifyToken,updatePost);
router.delete("/:id", verifyToken,deletePost);

router.post("/like/:id", verifyToken,likePost);
router.delete("/like/:id", verifyToken,unlikePost);
router.get(
  "/liked/:id",
  optionallyVerifyToken,getUserLikedPosts
);
router.get("/like/:postId/users", getUserLikes);

export default router