import Post from "../models/Post.models.js";
import Comment from "../models/Comment.models.js";

import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";

const cooldown=new Set();

//create comment
const createComment=asynchandler(async(req,res)=>{
    try {
        const postid=req.params.id
        const {content,parentId}=req.body
        const userId = req.user._id; // From auth middleware
    
        const post=await Post.findById(postid)
    
        if(!post){
            throw new apierror(400,"Post not found")
        }
        if(cooldown.has(postid)){
            throw new apierror(400,"User is commenting in the post too frequently")
        }
        cooldown.add(userId);
        setTimeout(()=>{
            cooldown.delete(userId)
        },30000)
    
        const comment=await Comment.create({
            commenter:userId,
            content:content,
            parent:parentId,
            post:postid
        })
        post.commentCount+=1;
        await post.save();
       await Comment.populate(comment, { path: "commenter", select: "-password" });
       return res.status(200).json(new apiresponse(200,{Comment:comment}))
    } catch (error) {
        throw new apierror(400,"Something went wrong while fetching the comment")
    }
})

//get comment 

const getPostComment=asynchandler(async(req,res)=>{
    try {
        const postid=req.params.id
        const comments=await Comment.findById({post:postid})
        .populate("commenter","-password")
        .sort("createdAt")

        if(!postid){
            throw new apierror(404,"Post not found")
        }
        if(!comments){
            throw new apierror(400,"Comment not found on the post")
        }     
        const commentParents={};
        const rootComments=[];
        
        //getting comment parents
        for(let i=0;i<comments.length;i++){
            let comment=comments[i];
            commentParents[comment.id]=comment
        }

        for(let i=0;i<comments.length;i++){
            const comment=comments[i];
            if(comment.parent){
                let commentParent=commentParents[comment.parent]
                commentParent.children=[...commentParent.children,comment]
            }
            else{
                rootComments = [...rootComments, comment];
            }
        }
        return res.status(200).json(new apiresponse(200,{PostComment:rootComments}))
        
    } catch (error) {
        throw new apierror(500,"Something went wrong in getPostComment")
    }
})

//get UserComment 

const getUserComment=asynchandler(async(req,res)=>{
    try {
        const userId=req.params.id
        let {page,sortBy}=req.query
        
        if(!sortBy){
            sortBy="-createdAt"
        }
        if(!page){
            page=1;
        }
         let comments = await Comment.find({ commenter: userId })
      .sort(sortBy)                      
      .populate("post"); 
      if(!comments)      {
        throw new apierror(400,"Comment doesn't exist")
      }   
      return res.status(200).json(new apiresponse(200,{UserComment:comments}))         
    } catch (error) {
        throw new apierror(500,"Something went wrong while getting user comment")
    }
})

//deleteComment 

const deleteComment=asynchandler(async(req,res)=>{
    try {
        const commentId=req.params.id;
        const {userId,isAdmin}=req.body

        const comment=await Comment.findById(commentId);

        if(!commentId){
            throw new apierror(400,"Comment not found")
        }
        if(comment.commenter!=userId && !isAdmin){
            throw new apierror(400,"Not authorized to delete comment")
        }
        await Comment.findByIdAndDelete(commentId);

        const post = await Post.findById(comment.post);

        post.commentCount = (await Comment.find({ post: post._id })).length;

        await post.save();
        return res.status(200).json(new apiresponse(200,{comment:comment}))
    } catch (error) {
        throw new apierror(500,"Something went wrong while deleting error")
    }
})

const updateComment = asynchandler(async (req, res) => {
  try {
    const commentId = req.params.id;
    const { userId, content, isAdmin } = req.body;

    if (!content) {
      throw new apierror(400,"All input required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new apierror(400,"Comment not found");
    }

    if (comment.commenter != userId && !isAdmin) {
      throw new apierror(400,"Not authorized to update comment");
    }

    comment.content = content;
    comment.edited = true;
    await comment.save();

    return res.status(200).json(new apiresponse(200,{comment:comment}));
  } catch (err) {
    throw new apierror(500,"Something went wrong updating the comment ")
  }
});

export{
    createComment,
    getPostComment,
    getUserComment,
    deleteComment,
    updateComment
}