import mongoose from "mongoose";

const Followschema= new mongoose.Schema({
    userID:{
        type:mongoose.Types.ObjectId,
        ref:"user",
        required:true,
    },
    followingId:{
        type:mongoose.Types.ObjectId,
        ref:"user",
        required:true,
    },
},
{timestamps:true});

module.exports=mongoose.model("Follow",Followschema);