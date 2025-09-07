// models/Contact.js

import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  agreedToPrivacyPolicy: {
    type: Boolean,
    required: true
    }
  
},{versionKey:false});


const ContactUs = mongoose.model("Contact", contactSchema);

export default ContactUs;
