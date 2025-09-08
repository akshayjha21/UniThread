import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import dotenv from 'dotenv';
dotenv.config(
    {
        path:"../.env"
    }
);

cloudinary.config({
  cloud_name: process.env.Cloudinary_Name,
  api_key: process.env.Cloudinary_API_KEY,
  api_secret: process.env.Cloudinary_API_SECRET_KEY
});


const uploadcloudinary = async (localfilepath) => {
    try {
        if (!localfilepath) return null;
        const response = await cloudinary.uploader.upload(
            localfilepath, {
                resource_type: "auto",
            }
        );
        console.log("File uploaded to Cloudinary. File URL: " + response.url);
        // Once the file is uploaded, delete it from the server
        fs.unlinkSync(localfilepath);
        return response;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        if (fs.existsSync(localfilepath)) {
            fs.unlinkSync(localfilepath);
        }
        return null;
    }
};

export { uploadcloudinary };