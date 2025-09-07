import mongoose, {set} from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        
    },
    password: {
        type: String,
        required: true,
        set: (value) => {
            console.log("setter executed...");
            const saltKey = bcrypt.genSaltSync(12);
            value = bcrypt.hashSync(value, saltKey);
            return value;
        }
    },
    contact: {
        type: Number,
      required:true  
    },
    bio: {
        type: String,
        default: null
    },
    country: {
        type: String,
        default: null
    },
    city: {
        type: String,
        default: null
    },
    skillToTeach: {
        type: String,
        default: null
    },
    skillToLearn: {
        type: String,
        default: null
    },
    profileImage: {
        type: String,
        default:null
    },

    isVerified: {
        type: Boolean,
        default: false
    }
}, { versionKey: false });

const User = mongoose.model("user", UserSchema);

export default User;