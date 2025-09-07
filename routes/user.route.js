import { CreateUser, deleteProfile, ForgetPassword, getAllUsers, getProfile, LogIn, logOut, updateProfile, VerifyEmail } from "../controller/user.controller.js";
import express from "express";
import { body } from "express-validator";
import { auth } from "../middleware/auth.js";
import multer from "multer";
const upload = multer({ dest: "public/profile" });

const router = express.Router();

router.post("/", body("name", "name is required").notEmpty(),
    body("email", "email id is required").notEmpty(),
    body("email", "invalid email id").isEmail(),
    body("password", "password is required").notEmpty(),
    body("confirmPassword", "password is required").notEmpty(),
    body("contact", "contact number is required").notEmpty(),
    body("contact", "only digits are allowed").isNumeric(), CreateUser);

router.post("/login", LogIn);
router.post("/forgetPassword", ForgetPassword);
router.get("/getAllUser", auth, getAllUsers);

router.post("/verification", VerifyEmail);
router.delete("/logout", auth, logOut);
router.put("/profile/:userId", auth, updateProfile);
router.delete("/delete/:userId", deleteProfile);
export default router;