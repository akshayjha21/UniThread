import {apierror} from "../utils/apierror.js"
import { asynchandler} from "../utils/asynchandler.js"
import {apiresponse} from "../utils/apiresponse.js"

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





