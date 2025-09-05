import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({ 
  username: {
    type: String,
    required: true,
    unique: true,
  }, 
  email: {
    type: String,
    required: true,
    unique: true,
  }, 
  password: {
    type: String,
    required: true
  },
  fullname: { 
    type: String, 
    required: true 
  },
  bio: { 
    type: String,
    default: ""
  }, // User description
  profilePicture: { 
    type: String,
    default: ""
  }, // URL or base64
  collegeDomain: { 
    type: String, 
    required: true 
  }, // Extracted from email
  year: { 
    type: String, 
    required: true,
    enum: ["1st", "2nd", "3rd", "4th", "Graduate"]
  }, // Freshman, Sophomore, Junior, Senior
  course: { 
    type: String,
    required: true
  }, // Engineering, Medicine, etc.

  // Verification
  isVerified: { 
    type: Boolean, 
    required: true,
    default: false
  }, // Email verification status
  verificationToken: { 
    type: String 
  },
  emailVerifiedAt: { 
    type: Date,
    default: null // Use null for unverified users
  },
  isActive: { 
    type: Boolean,
    default: true
  }
}, 
{ timestamps: true } // ✅ Correct placement - outside schema fields
);

export default mongoose.model("User",userSchema)
