//env config
import dotenv from 'dotenv';
dotenv.config({
    path:'./.env'
})

//importing routes
import Posts from './routes/Posts.routes.js'
import Comment from './routes/Comments.routes.js'

import Users from './routes/Users.routes.js'

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';

//establishing the express server

const app=express();


// common middlewares
app.use(cors())
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))//can acces public folders 
app.use(cookieParser())

//main routes
app.use("api/users",Users)
app.use("api/posts",Posts)
app.use("api/comments",Comment)

export {app};