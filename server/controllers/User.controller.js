import {apierror} from "../utils/apierror.js"
import { asynchandler} from "../utils/asynchandler.js"
import {apiresponse} from "../utils/apiresponse.js"
import {uploadcloudinary} from "../utils/Cloudinary.js"

//importing models 
import User from "../models/User.models.js"
import Post from "../models/Post.models.js"
import PostLike from "../models/PostLikes.models.js"
import Follow from "../models/Follow.models.js"

import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import dotenv from 'dotenv'

dotenv.config({
    path:'./.env'
})

//we will always deal with the mongodb operation using async and await

//generating access token and refresh token 
const generateacessandrefreshtoken =async(userid)=>{
    try {
        const user= await User.findById(userid);
    
        if(!user){
            throw new error(404,"User not found")
        }
        //generating the acess and refresh token
        const accessToken=user.generateacesstoken();
        const refreshToken=user.generaterefreshtoken();
    
        //we will save the refreshtoken in the db
        user.refreshToken=refreshToken;
    
        await user.save({validateBeforeSave:false});
        return{refreshToken,accessToken}
    } catch (error) {
        console.log("Error generating RefreshToken and AcessToken",error)
        throw new error(500,"Error generating RefreshToken and AcessToken")
    }
}

//Register the user 

const registeruser=asynchandler(async(req,res)=>{
    const {username,email,fullname,password}=req.body
    console.log("req body ",req.body)
    if([username,email,fullname,password].some((feild)=>feild?.trim()===""))
    {
        throw new apierror(403,"All feilds are required")
    }   
    const existeduser= await User.findOne({
        $or:[{email},{username}]
    })
    if (existeduser){
        throw new apierror(409,"User already exists")
    }
    /*handle the :
    avatar backend logic 
    */
   //now updating the db by saving the details in the db

   const user=await User.create({
    fullname,
    username:username.toLowerCase(),
    email,
    //avatar url is yet to be written
    password,
   })
   const createdUser= await User.findById(user._id).select("-password -refreshToken")
   if(!createdUser){
    throw new apierror(404,"Something went wrong while registering the user")
   }
   return res.status(200).json(
    new apiresponse(200,createdUser,"User created succesfully")
   )
})


export {
    registeruser,
}




