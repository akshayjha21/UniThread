import User from "../models/User.models.js";
import Post from "../models/Post.models.js";
import PostLike from "../models/PostLikes.models.js";
import Comment from "../models/Comment.models.js";

import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";

import mongoose from "mongoose";
import { filter } from "../utils/Filter.js";
import { paginate } from "../utils/Paginate.js";
import { uploadcloudinary } from "../utils/Cloudinary.js";

// Fix: Set not set
const cooldown = new Set();
const USER_LIKES_PAGE_SIZE = 20; // Define missing constant

// Creating a post
const createPost = asynchandler(async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user._id; // Fix: Get from auth middleware, not req.body

    // Fix: Use OR (||) not AND (&&)
    if (!title || !content) {
      throw new apierror(400, "Title and content are required"); // Fix: 400 not 410
    }

    // Fix: Can't reassign const, create new variable
    const cleanedContent = filter.clean(content);

    if (cooldown.has(userId.toString())) {
      throw new apierror(429, "Please wait before creating another post"); // Fix: 429 not 404
    }

    cooldown.add(userId.toString());
    setTimeout(() => {
      cooldown.delete(userId.toString());
    }, 60000);

    const post = await Post.create({
      title,
      content: cleanedContent,
      poster: userId,
    });

    return res.status(201).json(new apiresponse(201, { post }, "Post created successfully")); // Fix: 201 for creation
  } catch (error) {
    // Fix: Preserve original error if it's an apierror
    if (error instanceof apierror) throw error;
    throw new apierror(500, `Failed to create post: ${error.message}`);
  }
});

const createPostwithImg = asynchandler(async (req, res) => {
  try {
    const imgpostpath = req.file?.path;
    
    if (!imgpostpath) {
      throw new apierror(400, "Post image is required");
    }

    // Upload to Cloudinary
    const uploadimg = await uploadcloudinary(imgpostpath);

    if (!uploadimg?.url) {
      throw new apierror(500, "Failed to upload image to Cloudinary");
    }

    const { postId } = req.params;
    
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
    if (error instanceof apierror) throw error;
    throw new apierror(500, `Failed to upload image: ${error.message}`);
  }
});

const getPost = asynchandler(async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user?._id; // Fix: Optional chaining for optional auth

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new apierror(400, "Invalid post ID");
    }

    const post = await Post.findById(postId)
      .populate("poster", "-password")
      .lean();

    if (!post) {
      throw new apierror(404, "Post not found");
    }

    // Fix: Make userId optional - not all users need to be authenticated to view posts
    if (userId) {
      await setLiked([post], userId.toString());
    }

    await enrichWithUserLikePreview([post]);
    return res.status(200).json(new apiresponse(200, { post }, "Post retrieved successfully"));
  } catch (error) {
    if (error instanceof apierror) throw error;
    throw new apierror(500, `Failed to fetch post: ${error.message}`);
  }
});

const getPosts = asynchandler(async (req, res) => {
  try {
    const userId = req.user?._id; // Fix: Optional auth
    let { page, sortBy, author, search } = req.query;

    if (!sortBy) sortBy = "-createdAt";
    if (!page) page = 1;

    // Fix: Build database query instead of filtering after fetching
    let query = {};
    
    if (author) {
      const authorUser = await User.findOne({ username: author });
      if (authorUser) {
        query.poster = authorUser._id;
      } else {
        // Return empty result if author doesn't exist
        return res.status(200).json(new apiresponse(200, { data: [], count: 0 }));
      }
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    let posts = await Post.find(query)
      .populate("poster", "-password")
      .sort(sortBy)
      .lean();

    const count = posts.length;
    posts = paginate(posts, 10, page);

    if (userId) {
      await setLiked(posts, userId.toString());
    }

    await enrichWithUserLikePreview(posts);

    return res.status(200).json(new apiresponse(200, { data: posts, count }));
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new apierror(500, `Failed to fetch posts: ${error.message}`);
  }
});

const setLiked = async (posts, userId) => {
  let searchCondition = {};
  if (userId) searchCondition = { userId };
  
  const userPostLikes = await PostLike.find(searchCondition);
  
  posts.forEach((post) => {
    post.liked = false; // Fix: Initialize as false
    userPostLikes.forEach((userPostLike) => {
      if (userPostLike.postId.equals(post._id)) {
        post.liked = true;
        return;
      }
    });
  });
};

const enrichWithUserLikePreview = async (posts) => {
  const postMap = posts.reduce((result, post) => {
    result[post._id] = post;
    return result;
  }, {});
  
  const postLikes = await PostLike.find({
    postId: { $in: Object.keys(postMap) },
  })
    .limit(200)
    .populate("userId", "username");
  
  postLikes.forEach((postLike) => {
    const post = postMap[postLike.postId];
    if (!post.userLikePreview) {
      post.userLikePreview = [];
    }
    post.userLikePreview.push(postLike.userId);
  });
};

// Updating the post
const updatePost = asynchandler(async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.isAdmin || false;

    const post = await Post.findById(postId);
    if (!post) {
      throw new apierror(404, "Post not found");
    }

    // Fix: Proper authorization check with strict equality
    if (post.poster.toString() !== userId.toString() && !isAdmin) {
      throw new apierror(403, "Not authorized to update this post");
    }

    post.content = filter.clean(content);
    post.edited = true;
    await post.save();

    return res.status(200).json(new apiresponse(200, { post }, "Post updated successfully"));
  } catch (error) {
    if (error instanceof apierror) throw error;
    throw new apierror(500, `Failed to update post: ${error.message}`);
  }
});

// Deleting the post
const deletePost = asynchandler(async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const isAdmin = req.user.isAdmin || false;

    const post = await Post.findById(postId);
    if (!post) {
      throw new apierror(404, "Post not found");
    }

    // Fix: Proper authorization check
    if (post.poster.toString() !== userId.toString() && !isAdmin) {
      throw new apierror(403, "Not authorized to delete this post");
    }

    // Fix: Use findByIdAndDelete instead of deprecated remove()
    await Post.findByIdAndDelete(postId);
    await Comment.deleteMany({ post: postId });
    await PostLike.deleteMany({ postId: postId }); // Fix: Also delete related likes

    return res.status(200).json(new apiresponse(200, { message: "Post deleted successfully" }));
  } catch (error) {
    if (error instanceof apierror) throw error;
    throw new apierror(500, `Failed to delete post: ${error.message}`);
  }
});

// Like a post
const likePost = asynchandler(async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      throw new apierror(404, "Post not found");
    }

    const existingPostLike = await PostLike.findOne({ postId, userId });

    if (existingPostLike) {
      throw new apierror(409, "Post is already liked"); // Fix: 409 for conflict
    }

    const newLike = await PostLike.create({
      postId,
      userId,
    });

    // Update like count
    post.likeCount = await PostLike.countDocuments({ postId }); // Fix: Use countDocuments
    await post.save();

    return res.status(201).json(new apiresponse(201, { like: newLike }, "Post liked successfully"));
  } catch (error) {
    if (error instanceof apierror) throw error;
    throw new apierror(500, `Failed to like post: ${error.message}`);
  }
});

// Unlike a post
const unlikePost = asynchandler(async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      throw new apierror(404, "Post not found"); // Fix: Use apierror consistently
    }

    const existingPostLike = await PostLike.findOne({ postId, userId });

    if (!existingPostLike) {
      throw new apierror(409, "Post is not liked"); // Fix: 409 for conflict
    }

    // Fix: Use findByIdAndDelete instead of remove()
    await PostLike.findByIdAndDelete(existingPostLike._id);

    // Update like count
    post.likeCount = await PostLike.countDocuments({ postId });
    await post.save();

    return res.status(200).json(new apiresponse(200, { message: "Post unliked successfully" }));
  } catch (error) {
    if (error instanceof apierror) throw error;
    throw new apierror(500, `Failed to unlike post: ${error.message}`);
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

    return res.status(200).json(
      new apiresponse(200, { userLikes, hasMorePages }, "User likes retrieved successfully")
    );
  } catch (error) {
    throw new apierror(500, `Failed to fetch user likes: ${error.message}`);
  }
});

const getUserLikedPosts = asynchandler(async (req, res) => {
  try {
    const likerId = req.params.id;
    const userId = req.user?._id;
    let { page, sortBy } = req.query;

    if (!sortBy) sortBy = "-createdAt";
    if (!page) page = 1;

    let posts = await PostLike.find({ userId: likerId })
      .sort(sortBy)
      .populate({ path: "postId", populate: { path: "poster", select: "-password" } })
      .lean();

    // Fix: Get count before pagination
    const totalCount = posts.length;
    posts = paginate(posts, 10, page);

    let responsePosts = [];
    posts.forEach((post) => {
      if (post.postId) { // Fix: Check if postId exists (in case post was deleted)
        responsePosts.push(post.postId);
      }
    });

    if (userId) {
      await setLiked(responsePosts, userId.toString());
    }

    await enrichWithUserLikePreview(responsePosts);

    return res.status(200).json(
      new apiresponse(200, { data: responsePosts, count: totalCount }, "User liked posts retrieved successfully")
    );
  } catch (error) {
    console.error('Error fetching user liked posts:', error);
    throw new apierror(500, `Failed to fetch user liked posts: ${error.message}`);
  }
});

export {
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
};
