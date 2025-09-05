import mongoose from "mongoose";

const Folloswchema= new mongoose.Schema({
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