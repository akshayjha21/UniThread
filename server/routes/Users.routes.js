import express from "express"
import { verifyToken } from "../middlewares/auth"
import userControllers from "../controllers/User.controller"

const router=express.Router();

router.post("/register", userControllers.registerUser);
router.post("/login", userControllers.loginingUser);
router.post("/logout", userControllers.loggedOut);
router.get("/random", userControllers.getRandomUsers);

router.get("/:username", userControllers.getUser);
router.patch("/:id", verifyToken, userControllers.updateUser);

router.patch("/:id/password", verifyToken, userControllers.changeCurrentPassword);
router.patch("/:id/avatar", verifyToken, userControllers.updateUserAvatar);

router.post("/follow/:id", verifyToken, userControllers.followUser);
router.delete("/unfollow/:id", verifyToken, userControllers.unfollowUser);

router.get("/followers/:id", userControllers.getFollowers);
router.get("/following/:id", userControllers.getFollowing);

export default router