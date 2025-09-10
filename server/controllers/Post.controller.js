import User from "../models/User.models.js";
import Post from "../models/Post.models.js";
import PostLike from "../models/PostLikes.models.js";
import Comment from "../models/Comment.models.js";

import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";

import mongoose from "mongoose";
import {filter} from "../utils/Filter.js"
import { paginate } from "../utils/Paginate.js";
import { uploadcloudinary } from "../utils/Cloudinary.js";

const cooldown=new set();


//creating a post
//rember we have to upload the image too

const createPost=asynchandler(async(req,res)=>{
    try {
        const {title,content,userId}=req.body;
    
        if(!title && !content){
            throw new apierror(410,"Required fieilds are needed")
        }
        if(cooldown.has(userId)){
            throw new apierror(404,"User is posting the content too frequently")
        }
        cooldown.add(userId);
        setTimeout(()=>{
            cooldown.delete(userId)
        },60000)
    
          const post = await Post.create({
          title,
          content,
          poster: userId,
        });
        return res.status(200).json(new apiresponse(200,{Post:post}))
    } catch (error) {
        throw new apierror(404,"Something went wrong while creating the Post")
    }
})
const createPostwithImg = asynchandler(async (req, res) => {
  try {
    // Fix: req.file not req.filed
    const imgpostpath = req.file?.path;
    
    if (!imgpostpath) {
      throw new apierror(400, "Post image is required"); // Fix: 400 not 409
    }

    // Upload to Cloudinary
    const uploadimg = await uploadcloudinary(imgpostpath);

    if (!uploadimg?.url) {
      throw new apierror(500, "Failed to upload image to Cloudinary"); // Fix: 500 not 409
    }

    // Fix: Get postId from params or body, not req.Post
    const { postId } = req.params; // or req.body.postId
    
    if (!postId) {
      throw new apierror(400, "Post ID is required");
    }

    // Update the post with image URL
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        $set: {
          image: uploadimg.url // Fix: use 'image' not 'url' (match your schema)
        }
      },
      { new: true, runValidators: true } // Add runValidators for safety
    );

    if (!post) {
      throw new apierror(404, "Post not found");
    }

    return res.status(200).json(
      new apiresponse(200, { post }, "Image uploaded successfully")
    );
  } catch (error) {
    throw new apierror(500, `Failed to upload image: ${error.message}`);
  }
});

export{
    createPost,
    createPostwithImg,
    
}
