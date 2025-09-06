import mongoose from "mongoose";

const PostLike=new mongoose.Schema({
    postId:{
        type:mongoose.Types.ObjectId,
        ref:"Post",
        required:true,
    },
    userId:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true,
    },
},
{timestamps:true});
export default mongoose.model("PostLike", PostLike);
