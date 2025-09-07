import { validationResult } from "express-validator";
import User  from "../models/user.model.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
dotenv.config();

export const CreateUser = async (request, response, next) => {
    try {
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            return response.status(400).json({ error: "Bad request", errorMessages: errors.array() });
        }
        let { name, email, password, contact, confirmPassword } = request.body;

        if (password != confirmPassword) {
            return response.status(404).json({ message: "Password doesn't Matched..." });
        }
        let isUser = await User.findOne({email});
        if (isUser) {
            return response.status(404).json({ message: "user already exists | email already registered with another account...." });
        }

        let newUser = await User.create({ name, password, contact, email });
        await SendEmail(email,name);
        return response.status(201).json({ message: "User registered successfully..", user: newUser });

    } catch (err) {
        console.log(err);
        return response.status(500).json({ error: "Internal Server Error..." });
        
    }
}

export const LogIn = async (request, response, next) => {
    try {
        let { email, password } = request.body;

        let user = await User.findOne({ email });

        if (!user.isVerified) {
            return response.status(401).json({ error: "Unauthorized user | Account is not Verified.." });
        }
        if (!user) {
            return response.status(401).json({ error: "Unauthorized user | Email id not found" });
        }
        let status = await bcrypt.compareSync(password, user.password);
        user.password = undefined;
        let userId = user._id;
        status && response.cookie("token", generateToken(userId, user.email, user.contact), {
            httpOnly: true,
            secure: false, 
            sameSite: 'strict'
        });
        return status ? response.status(200).json({ message: "Sign In Successfully.." ,user}) : response.status(401).json({ error: "Unauthorized user | Invalid password" });

    }
    catch (error) {
        console.log(error); 
        return response.status(500).json({ error: "Internal Server Error" })
    }
}


export const ForgetPassword = async (request, response, next) => {
    try {
        const { email, newPassword, confirmPassword } = request.body;

        // if (!email || !newPassword || !confirmPassword) {
        //     return response.status(400).json({ message: "All fields are required!" });
        // }

        const isUser = await User.findOne({ email });
        if (!isUser) {
            return response.status(404).json({ message: "User not found with this email." });
        }

        if (newPassword !== confirmPassword) {
            return response.status(400).json({ message: "Passwords do not match." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        isUser.password = hashedPassword;
        await isUser.save();

       
        // await SendEmail(email);

        return response.status(200).json({ message: "Password reset successfully." });

    } catch (error) {
        console.error("Forget Password Error:", error);
        return response.status(500).json({ message: "Something went wrong on server." });
    }
};


export const VerifyEmail = async (request, response, next) => {
    try {
        const { email } = request.body;
        const updateVerifiedStatus = { $set: { isVerified: true } };

        let result = await User.updateOne({ email },updateVerifiedStatus );
        console.log(result);
        
        return response.status(200).json({message:"Account Verified Successfully..."})
    }
    catch (err) {
        return response.status(500).json({ Error: "Internal Server Error.." });
    }
}


export const SendEmail = (email, name) => {
    return new Promise((resolve, reject) => {
    
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });
          
        let mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Account Verification',
            html: `<img src="https://sdmntprukwest.oaiusercontent.com/files/00000000-f1fc-6243-9c7c-52b825350f85/raw?se=2025-08-14T22%3A58%3A48Z&sp=r&sv=2024-08-04&sr=b&scid=d39f4d62-fc76-5080-a137-7abf9d2a9aa3&skoid=5c72dd08-68ae-4091-b4e1-40ccec0693ae&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-08-14T21%3A17%3A29Z&ske=2025-08-15T21%3A17%3A29Z&sks=b&skv=2024-08-04&sig=6dZpx/jT5oM9aRn3dW/g4T6T5z5aCDaelx9MOH0qKVc%3D" width="300" style="border-radius:8px;"/>
            <h4>Dear ${name}</h4>
            <p>Thank You for ragistration. To Verify your account Please Click on Below Button</p>
            <form method="post" action="https://skillhub-mern-project-backend.onrender.com/user/verification">
              <input type="hidden" name="email" value="${email}"/>
              <button type="submit" style="background-color: green; color:white; width:100px;padding:12px; border: none; border: 1px solid grey; border-radius:10px;">Verify</button>
            </form>
            <p>
            <h6> Thank You </h6> 
            Backend API 
             </p>`
        };
          
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
          
    });
}



export const logOut = async (request, response, next) => {
    try {
        response.clearCookie("token");
        return response.status(200).json({ message: "Sign Out Successfully..." });
    } catch (err) {
        return response.status(500).json({ error: "Internal Server Error..." });
    }
}


export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("User ID:", userId);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      contact,
      email,
      bio,
      country,
      city,
      skillToTeach,
      skillToLearn,
      profileImage,
    } = req.body;

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.contact = contact ?? user.contact;
    user.bio = bio ?? user.bio;
    user.country = country ?? user.country;
    user.city = city ?? user.city;
    user.skillToTeach = skillToTeach ?? user.skillToTeach;
    user.skillToLearn = skillToLearn ?? user.skillToLearn;
    user.profileImage = profileImage ?? user.profileImage;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      updatedUser,
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Internal Server error" });
  }
};





export const getProfile = async (request, response, next) => {
    try {
        let getuser = await User.find();
        return response.status(200).json({ message: "Get Profile Successfully...", getuser });
    }
    catch (err) {
        return response.status(500).json({ error: "Internal Server Error.." });
    }
}

// user.controller.js
export const getAllUsers = async (request, response) => {
  try {
    const users = await User.find();
    const loggedInUserId = request.user?._id; // agar login kiya hai to bhejo
    response.status(200).json({ success: true, users, loggedInUserId });
  } catch (error) {
    response.status(500).json({ success: false, message: error.message });
  }
};



export const deleteProfile = async (request, response, next) => {
    try {
        const {userId} = request.params;

        const user = await User.findById(userId);
        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }

        await User.findByIdAndDelete(userId);

        return response.status(200).json({ message: "Account deleted successfully" });
    } catch (err) {
        console.log(err);
        return response.status(500).json({ error: "Internal Server Error..." });
    }
};



const generateToken = (userId, email,contact) => {
    let payload = { userId, email,contact };
    let token = jwt.sign(payload, process.env.TOKEN_SECRET);
    console.log(token);
    return token;
    
}