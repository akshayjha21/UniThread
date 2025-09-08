import mongoose from "mongoose";

const Followschema= new mongoose.Schema({
    userID:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true,
    },
    followingId:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true,
    },
},
{timestamps:true});

export default mongoose.model("Follow",Followschema)