import express from "express"
import { verifyToken } from "../middlewares/auth.js"
import {
     registerUser, 
    logingUser,
    loggedOut,
    refreshAccessToken,
    changeCurrentPassword,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getUser,
    getRandomUsers,
    updateUserAvatar,
    updateUser
} from "../controllers/User.controller.js"

const router=express.Router();

router.post("/register",registerUser);
router.post("/login",logingUser);
router.post("/logout",loggedOut);
router.get("/random",getRandomUsers);

router.get("/:username",getUser);
router.patch("/:id", verifyToken,updateUser);

router.patch("/:id/password", verifyToken,changeCurrentPassword);
router.patch("/:id/avatar", verifyToken,updateUserAvatar);

router.post("/follow/:id", verifyToken,followUser);
router.delete("/unfollow/:id", verifyToken,unfollowUser);

router.get("/followers/:id",getFollowers);
router.get("/following/:id",getFollowing);

export default router