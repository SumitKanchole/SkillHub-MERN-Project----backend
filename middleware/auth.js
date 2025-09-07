import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user.model.js";

dotenv.config();

export const auth = async (request, response, next) => {
    let { token } = request.cookies;
    console.log(token);
    try {
        if (!token)
            return response.status(400).json({ message: "unauthorized User | No Token Provided", token });
            console.log(token);
        let decode = jwt.verify(token, process.env.TOKEN_SECRET);
        request.userid = decode.userid;
        console.log(decode);
        
        
        request.user = decode.user;
        next();
        
    }
    catch (err) {
        console.log(err);
        
        return response.status(500).json({ error: "Internal Server Error" });

    }
}