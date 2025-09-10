import mongoose from "mongoose";
import PostLike from "./PostLikes.models.js";
import { filter } from "../utils/Filter.js";

const PostSchema = new mongoose.Schema(
  {
    poster: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxLength: [80, "Must be no more than 80 characters"],
    },
    content: {
      type: String,
      required: true,
      maxLength: [8000, "Must be no more than 8000 characters"],
    },
    image: [
      {
        url: String,
        publicId: String, // For Cloudinary deletion
        alt: String,
      },
    ],
    video: [
      {
        url: String,
        publicId: String,
        thumbnail: String,
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    edited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

PostSchema.pre("save", function (next) {
  if (this.title.length > 0) {
    this.title = filter.clean(this.title);
  }

  if (this.content.length > 0) {
    this.content = filter.clean(this.content);
  }

  next();
});
PostSchema.pre("remove", async function (next) {
  console.log(this._id);
  await PostLike.deleteMany({ postId: this._id });
  next();
});

export default mongoose.model("Post", PostSchema);
