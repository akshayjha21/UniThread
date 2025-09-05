
import mongoose from "mongoose";
import { filter } from "../utils/Filter.js";

const CommentSchema = new mongoose.Schema({
    commenter: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    post: {                    // ✅ Fixed: camelCase field name
        type: mongoose.Types.ObjectId,
        ref: "Post",
        required: true,
    },
    content: {
        type: String,
        required: true,
        maxLength: [2000, "Comment must be no more than 2000 characters"], // Added validation
    },
    parent: {
        type: mongoose.Types.ObjectId,
        ref: "Comment",
    },
    children: [{               // ✅ Fixed: Array for multiple children
        type: mongoose.Types.ObjectId,
        ref: "Comment"
    }],
    edited: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true
});

// ✅ Fixed: Correct model name and better error handling
CommentSchema.post("remove", async function (doc, next) {
    try {
        const comments = await this.model("Comment").find({ parent: this._id });
        
        for (let i = 0; i < comments.length; i++) {
            const comment = comments[i];
            await comment.remove();
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

CommentSchema.pre("save", function (next) {
    if (this.content && this.content.length > 0) {  // ✅ Added null check
        this.content = filter.clean(this.content);
    }
    next();
});

// ✅ Fixed: Consistent PascalCase naming
const Comment = mongoose.model("Comment", CommentSchema);
export default Comment;
