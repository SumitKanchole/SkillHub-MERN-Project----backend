import Contact from "../models/Contact.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const submitContactForm = async (req, res) => {
  try {
    const { firstName, lastName, email, message, agreedToPrivacyPolicy } = req.body;

    if (!firstName || !lastName || !email || !message || !agreedToPrivacyPolicy) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const contact = new Contact({
      firstName,
      lastName,
      email,
      message,
      agreedToPrivacyPolicy
    });

    await contact.save();
    
      const name = `${firstName} ${ lastName}`;
      
    await SendEmailToUser(email, name);
      
    res.status(201).json({ message: "Query submitted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



export const SendEmailToUser = (email, name) => {
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
            subject: 'Thank You for Contacting SkillHub!',
            html: `<div style="border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                <h2 style="color: #2c3e50;">Hi ${name},</h2>
                <p>Thank you for reaching out to us at <strong>SkillHub</strong>!</p>
                <p>We’ve received your message and our team will get back to you as soon as possible. <br /> Your query is important to us and we’re here to help you with anything related to skill exchange,<br /> matches, or platform support.</p>
                <p>In the meantime, feel free to explore more opportunities on SkillHub and connect with <br /> passionate learners and teachers around you.</p>
                <p>🔗 <a href="https://localhost:3001" style="color: #2980b9;">Visit us again</a></p>
                <br />
                <p>Best regards,</p>
                <p><strong>The SkillHub Team</strong><br />
                <a href="mailto:support@skillhub.com" style="color: #2980b9;">support@skillhub.com</a></p>
                </div>`
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