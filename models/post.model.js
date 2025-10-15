import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: 2000
    },
    category: {
        type: String,
        enum: ['Advice', 'Knowledge', 'Experience', 'Tips', 'Tutorial', 'Discussion', 'Other'],
        default: 'Other'
    },
    tags: [{
        type: String,
        trim: true,
        maxLength: 30
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    isPublic: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false
});

PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ category: 1 });
PostSchema.index({ tags: 1 });

const Post = mongoose.model("post", PostSchema);

export default Post;