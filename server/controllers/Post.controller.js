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
        content= filter.clean(content)
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
      throw new apierror(400, "Post image is required"); 
    }

    // Upload to Cloudinary
    const uploadimg = await uploadcloudinary(imgpostpath);

    if (!uploadimg?.url) {
      throw new apierror(500, "Failed to upload image to Cloudinary"); 
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
          image: uploadimg.url
        }
      },
      { new: true, runValidators: true } 
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

const getPost=asynchandler(async(req,res)=>{
    try {
        const Postid=req.params.id
        const {userId}=req.body
    
        if(!mongoose.Types.ObjectId.isValid(Postid)){
            throw new apierror(400,"Poster does not exist")
        }
        const post = await Post.findById(Postid)
          .populate("poster", "-password")
          .lean();
    
         if (!post) {
          throw new apierror(400,"Post does not exist");
        }
        if(!userId){
            throw new apierror(400,"Post does not found")
        }
         if (userId) {
          await setLiked([post], userId);
        }
        await enrichWithUserLikePreview([post]);
        return res.status(200).json({Posts:post})
    } catch (error) {
        throw new apierror(500,"Something went wrong while fetching the post")
    }
})
const getPosts = asynchandler(async (req, res) => {
  try {
    const { userId } = req.body;

    let { page, sortBy, author, search, liked } = req.query;

    if (!sortBy) sortBy = "-createdAt";
    if (!page) page = 1;

    let posts = await Post.find()
      .populate("poster", "-password")
      .sort(sortBy)
      .lean();

    if (author) {
      posts = posts.filter((post) => post.poster.username == author);
    }

    if (search) {
      posts = posts.filter((post) =>
        post.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    const count = posts.length;

    posts = paginate(posts, 10, page);

    if (userId) {
      await setLiked(posts, userId);
    }

    await enrichWithUserLikePreview(posts);

    return res.status(200).json(new apiresponse(200,{ data: posts, count }));
  } catch (err) {
    console.log(err.message);
    throw new apierror(500,"Something went wrong while fetching Posts");
  }
});

/*
The setLiked function is likely a utility function that:
What it does:
        ?Gets all likes by a specific user from the PostLike collection
        ?Loops through posts and checks if the user liked each one
        ?Adds liked: true property to posts that the user has liked
*/
const setLiked = async (posts, userId) => {
  let searchCondition = {};
  if (userId) searchCondition = { userId };
  
  // Get all likes made by this specific user
  const userPostLikes = await PostLike.find(searchCondition);
  
  // Loop through each post
  posts.forEach((post) => {
    // For each post, check if the user has liked it
    userPostLikes.forEach((userPostLike) => {
      if (userPostLike.postId.equals(post._id)) {
        post.liked = true; // Mark this post as liked by the user
        return;
      }
    });
  });
};

//?Purpose: Adds a preview of users who liked each post (like "John, Sarah and 5 others liked this")

const enrichWithUserLikePreview = async (posts) => {
  // Create a map of posts by their ID for quick lookup
  const postMap = posts.reduce((result, post) => {
    result[post._id] = post;
    return result;
  }, {});
  
  // Get likes for all posts (limited to 200 for performance)
  const postLikes = await PostLike.find({
    postId: { $in: Object.keys(postMap) }, // All post IDs
  })
    .limit(200)
    .populate("userId", "username"); // Get username of users who liked
  
  // Add user like previews to each post
  postLikes.forEach((postLike) => {
    const post = postMap[postLike.postId];
    if (!post.userLikePreview) {
      post.userLikePreview = [];
    }
    post.userLikePreview.push(postLike.userId); // Add user info
  });
};

//updating the post
const updatePost=asynchandler(async(req,res)=>{
   try {
     const postId=req.params.id;
     const{content,userId,isAdmin}=req.body
     const post=await Post.findById(postId);
     if(!post){
         throw new apierror(400,"Post cannot be found")
     }
     if(post.poster!=userId && post.isAdmin!=isAdmin){
         throw new apierror(400,"User is not authorized")
     }
     post.content=content;
     post.edited=true;
     await post.save();
     return res.status(200).json({updatedPost:post})
   } catch (error) {
    throw new apierror(500,"Something went wrong while updating the Post")
   }
})

//deleting the post
const deletePost=asynchandler(async(req,res)=>{
    try {
        const postId=req.params.id
        const {userId,isAdmin}=req.body
        const post=await Post.findById(postId)
        if(!post){
            throw new apierror(400,"Post not found")
        }
        if(post.poster!=userId && !isAdmin){
            throw new apierror(400,"Not authorized to delete post")
        }
        await post.remove()
        await Comment.deleteMany({ post: post._id });
        return res.status(200).json({Post:post})
    } catch (error) {
        throw new apierror(500,"Something went wrong while deleting the post")
    }
})

//to check the post is liked or not 
const likePost=asynchandler(async(req,res)=>{
    try {
        const postId=req.params.id
        const {userId}=req.body

        const post=await Post.findById(postId);
            if (!post) {
      throw new apierror(404,"Post does not exist");
    }

    const existingPostLike = await PostLike.findOne({ postId, userId });

    if (existingPostLike) {
      throw new apierror(404,"Post is already liked");
    }

    await PostLike.create({
      postId,
      userId,
    });

    post.likeCount = (await PostLike.find({ postId })).length;

    await post.save();
    return res.status(200).json( new apiresponse(200,existingPostLike))
    } catch (error) {
        throw new apierror(500,"Something went wrong while fetching the likedPost")
    }
})

//to check the posts are unliked or not

const unlikePost = asynchandler(async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      throw new Error("Post does not exist");
    }

    const existingPostLike = await PostLike.findOne({ postId, userId });

    if (!existingPostLike) {
      throw new Error("Post is already not liked");
    }

    await existingPostLike.remove();

    post.likeCount = (await PostLike.find({ postId })).length;

    await post.save();

    return res.status(200).json(new apiresponse(200,{ success: true }));
  } catch (err) {
    throw new apierror(500,"Something went wrong while fetching unlikePost")
  }
});


const getUserLikes = asynchandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { anchor } = req.query;

    const postLikesQuery = PostLike.find({ postId: postId })
      .sort("_id")
      .limit(USER_LIKES_PAGE_SIZE + 1)
      .populate("userId", "username");

    if (anchor) {
      postLikesQuery.where("_id").gt(anchor);
    }

    const postLikes = await postLikesQuery.exec();

    const hasMorePages = postLikes.length > USER_LIKES_PAGE_SIZE;

    if (hasMorePages) postLikes.pop();

    const userLikes = postLikes.map((like) => {
      return {
        id: like._id,
        username: like.userId.username,
      };
    });

    return res
      .status(200)
      .json(new apiresponse(200,{ userLikes: userLikes, hasMorePages, success: true }));
  } catch (err) {
    throw new apierror(500,"Something went wrong while fetching the userLikes")
  }
});

const getUserLikedPosts = asynchandler(async (req, res) => {
  try {
    const likerId = req.params.id;
    const { userId } = req.body;
    let { page, sortBy } = req.query;

    if (!sortBy) sortBy = "-createdAt";
    if (!page) page = 1;

    let posts = await PostLike.find({ userId: likerId })
      .sort(sortBy)
      .populate({ path: "postId", populate: { path: "poster" } })
      .lean();

    posts = paginate(posts, 10, page);

    const count = posts.length;

    let responsePosts = [];
    posts.forEach((post) => {
      responsePosts.push(post.postId);
    });

    if (userId) {
      await setLiked(responsePosts, userId);
    }

    await enrichWithUserLikePreview(responsePosts);

    return res.status(200).json(new apiresponse(200,{ data: responsePosts, count }));
  } catch (err) {
    console.log(err);
    throw new apierror(500,"Something went wrong with getUserLikedPosts")
  }
});


export{
    getPost,
    getPosts,
    createPost,
    createPostwithImg,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getUserLikes,
    getUserLikedPosts
}
