import Post from "../models/Post.models";
import Comment from "../models/Comment.models";
import { paginate } from "../utils/Paginate";
import mongoose from "mongoose";

const cooldown=new Set();
