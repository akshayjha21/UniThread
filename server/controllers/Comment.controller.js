import Post from "../models/Post.models";
import Comment from "../models/Comment.models";
import { paginate } from "../utils/Paginate";
import mongoose from "mongoose";

import { asynchandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierror.js";
import { apiresponse } from "../utils/apiresponse.js";

const cooldown=new Set();

const createComment=asynchandler(async(req,res)=>{
    try {
        const postid=req.params.id
        const {content,parentId,userId}=req.body
    
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

export{
    createComment
}