import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import  isEmail from "validator";
import  contains from "validator";
import {filter} from "../utils/Filter.js"; // Assuming you have this profanity filter

const userSchema = new Schema({ 
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: [6, "Must be at least 6 characters long"],
    maxlength: [30, "Must be no more than 30 characters long"],
    validate: {
      validator: (val) => !contains(val, " "),
      message: "Must contain no spaces",
    },
  }, 
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [isEmail, "Must be valid email address"], // ✅ Using validator.js
  }, 
  password: {
    type: String,
    required: true,
    minlength: [8, "Must be at least 8 characters long"]
  },
  fullname: { 
    type: String, 
    required: true,
    trim: true
  },
  bio: { // ✅ Renamed from biography for consistency with your original
    type: String,
    default: "",
    maxlength: [250, "Must be no more than 250 characters long"]
  },
  avatar: { 
    type: String,
    default: ""
  },
  // collegeDomain: { 
  //   type: String, 
  //   required: true,
  //   lowercase: true
  // },
  // year: { 
  //   type: String, 
  //   required: true,
  //   enum: ["1st", "2nd", "3rd", "4th", "Graduate"]
  // },
  // course: { 
  //   type: String,
  //   required: true,
  //   trim: true
  // },

  // Verification fields
  // isVerified: { 
  //   type: Boolean, 
  //   required: true,
  //   default: false
  // },
  verificationToken: { 
    type: String 
  },
  // emailVerifiedAt: { 
  //   type: Date,
  //   default: null
  // },
  refreshToken: { type: String },
  isActive: { 
    type: Boolean,
    default: true
  },
  
  // ✅ Added from reference code
  // isAdmin: {
  //   type: Boolean,
  //   default: false
  // }
}, 
{ timestamps: true });

// ✅ Enhanced pre-save middleware with profanity filtering
userSchema.pre("save", async function (next) {
  try {
    // Check username for profanity
    if (filter.isProfane(this.username)) {
      throw new Error("Username cannot contain profanity");
    }
    
    // Clean bio if it exists
    if (this.bio && this.bio.length > 0) {
      this.bio = filter.clean(this.bio);
    }
    
    // Clean fullname if needed
    if (this.fullname && filter.isProfane(this.fullname)) {
      this.fullname = filter.clean(this.fullname);
    }
    if (!this.isModified("password")) { return next(); }
    this.password = bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

//generating the acesstoken

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

//validating password 
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}


userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};


export default mongoose.model("User", userSchema);
