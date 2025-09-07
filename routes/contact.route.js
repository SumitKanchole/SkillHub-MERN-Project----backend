import express from "express";

import { submitContactForm } from "../controller/contact.controller.js";

const router = express.Router();

router.post("/sendquery", submitContactForm);

export default router;
