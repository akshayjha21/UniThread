import { apierror } from "../utils/apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import { apiresponse } from "../utils/apiresponse.js";
import { uploadcloudinary } from "../utils/Cloudinary.js";

//importing models
import User from "../models/User.models.js";
import Post from "../models/Post.models.js";
import Follow from "../models/Follow.models.js";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

//generating access token and refresh token
const generateacessandrefreshtoken = async (userid) => {
  try {
    const user = await User.findById(userid);

    if (!user) {
      throw new apierror(404, "User not found");
    }
    //generating the access and refresh token
    const accessToken = user.generateacesstoken();
    const refreshToken = user.generaterefreshtoken();

    //we will save the refreshtoken in the db
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { refreshToken, accessToken };
  } catch (error) {
    console.log("Error generating RefreshToken and AccessToken", error);
    throw new apierror(500, "Error generating RefreshToken and AccessToken");
  }
};

//Register the user
const registerUser = asynchandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  console.log("req body ", req.body);
  if (
    [username, email, fullname, password].some((feild) => feild?.trim() === "")
  ) {
    throw new apierror(403, "All fields are required");
  }
  const existeduser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existeduser) {
    throw new apierror(409, "User already exists");
  }
  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  if (!createdUser) {
    throw new apierror(404, "Something went wrong while registering the user");
  }
  return res
    .status(200)
    .json(new apiresponse(200, createdUser, "User created successfully"));
});

// writing the login user
const logingUser = asynchandler(async (req, res) => {
  const { email, username, password } = req.body;
  console.log(email);
  if (!username && !email) {
    throw new apierror(404, "Username or Email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new apierror(409, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apierror(404, "Enter a correct password");
  }

  const { refreshToken, accessToken } = await generateacessandrefreshtoken(
    user._id,
  );

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiresponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully",
      ),
    );
});

//logging out the user
const loggedOut = asynchandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiresponse(200, {}, "User logged Out"));
});

//creating the refresh token and accessToken
const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingrequest = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingrequest) {
    throw new apierror(404, "unauthorised request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingrequest,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new apierror(404, "Unauthorized Token");
    }

    if (incomingrequest !== user?.refreshToken) {
      throw new apierror(404, "refreshToken expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newrefreshToken } = await generateacessandrefreshtoken(
      user._id,
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new apiresponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new apierror(401, error?.message || "Invalid refresh token");
  }
});

//changing the current password
const changeCurrentPassword = asynchandler(async(req,res) => {
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id);
    if(!user){
        throw new apierror(404,"User not found")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new apierror(401,"Please enter correct password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})
    return res
    .status(200)
    .json(new apiresponse(200,{},"Password changed successfully"))
})

//creating Follow
const followUser = asynchandler(async(req,res) => {
    try {
        const {userId} = req.body
        const followingId = req.params.id;

        const existingFollow = await Follow.findOne({userId, followingId})
        if(existingFollow){
            throw new apierror(400,"Already following the user")
        }
        const newFollow = await Follow.create({userId, followingId})
        return res.status(200).json(
            new apiresponse(200,
                {followData: newFollow},
                "Successfully followed user"
            )
        )
    } catch (error) {
        throw new apierror(400, error?.message || "Failed to follow user")
    }
})

//creating unfollow
const unfollowUser = asynchandler(async(req,res) => {
    try {
        const {userId} = req.body
        const followingId = req.params.id;

        const deletedFollow = await Follow.findOneAndDelete({userId, followingId})
        if(!deletedFollow){
            throw new apierror(404,"User is not following this person")
        }
        
        return res.status(200).json(
            new apiresponse(200,
                {unfollowData: deletedFollow},
                "Successfully unfollowed user"
            )
        )
        
    } catch (error) {
        throw new apierror(400, error?.message || "Error in unfollow operation")
    }
})

//getting followers
const getFollowers = asynchandler(async(req,res) => {
    try {
       const userId=req.param.id
       const followers=await Follow.find({followingId:userId})
        return res.status(200).json(new apiresponse(200, {followersList: followers}))
    } catch (error) {
        throw new apierror(404, "Something went wrong while fetching the followers list")
    }
})

//getting following
const getFollowing = asynchandler(async (req, res) => {
  try {
    const userId = req.params.id;

    const following = await Follow.find({ userId });

    return res.status(200).json(new apiresponse(200, {followingList: following}));
  } catch (err) {
    throw new apierror(404, "Something went wrong while fetching following list");
  }
});

// ✅ FIXED: getUser function
const getUser = asynchandler(async (req, res) => {
  try {
    const username = req.params.username;

    const user = await User.findOne({ username }).select("-password");

    if (!user) {
      throw new apierror(404, "User does not exist"); // ✅ Fixed: was throw new Error
    }

    const posts = await Post.find({ poster: user._id })
      .populate("poster")
      .sort("-createdAt");

    let likeCount = 0;

    posts.forEach((post) => {
      likeCount += post.likeCount;
    });

    const data = {
      user,
      posts: {
        count: posts.length,
        likeCount,
        data: posts,
      },
    };

    return res.status(200).json(new apiresponse(200, {Userdata: data}));
  } catch (err) { // ✅ Fixed: was 'error' in original catch block variable
   throw new apierror(404, err?.message || "Something went wrong while fetching user data");
  }
});

const getRandomIndices = (size, sourceSize) => {
  const randomIndices = [];
  while (randomIndices.length < size) {
    const randomNumber = Math.floor(Math.random() * sourceSize);
    if (!randomIndices.includes(randomNumber)) {
      randomIndices.push(randomNumber);
    }
  }
  return randomIndices;
};

// ✅ FIXED: getRandomUsers function
const getRandomUsers = asynchandler(async (req, res) => {
  try {
    let { size } = req.query;
    size = parseInt(size) || 10; // ✅ Fixed: Added parsing with default value

    const users = await User.find().select("-password");

    const randomUsers = [];

    if (size > users.length) {
      size = users.length;
    }

    const randomIndices = getRandomIndices(size, users.length);

    for (let i = 0; i < randomIndices.length; i++) {
      const randomUser = users[randomIndices[i]];
      randomUsers.push(randomUser);
    }

    return res.status(200).json(
        new apiresponse(200, {randomUsers}, "Random users generated") // ✅ Fixed: Added data and corrected message
    );
  } catch (err) {
    console.log(err);
    throw new apierror(400, err?.message || "Error fetching random users"); // ✅ Fixed: Use apierror consistently
  }
});

//updateAvatar
const updateUserAvatar = asynchandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new apierror(400, "Avatar file is missing")
    }

    const avatar = await uploadcloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new apierror(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new apiresponse(200, user, "Avatar image updated successfully")
    )
})

const updateUser = asynchandler(async (req, res) => {
  try {
    const { userId, biography } = req.body;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User does not exist" });
    }

    // Validate biography if provided
    if (biography !== undefined) {
      if (typeof biography !== "string") {
        return res.status(400).json({ error: "Biography must be a string" });
      }
      
      if (biography.length > 250) {
        return res.status(400).json({ error: "Biography must be no more than 250 characters" });
      }

      // Check for profanity before saving
      if (filter.isProfane(biography)) {
        return res.status(400).json({ error: "Biography contains inappropriate content" });
      }

      user.bio = biography; // Use 'bio' to match your schema
    }

    await user.save();

    // Return updated user data (excluding sensitive info)
    const updatedUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      bio: user.bio,
      avatar: user.avatar
    };

    return res.status(200).json({ 
      success: true, 
      message: "User updated successfully",
      user: updatedUser 
    });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
export { 
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
};
