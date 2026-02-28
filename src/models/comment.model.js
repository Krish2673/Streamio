import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const commentSchema = new Schema({
    content : {
        type : String,
        required : true
    },
    video : {
        type : Schema.Types.ObjectId,
        ref : "Video"
    },
    owner : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    likeCount : {
        type : Number,
        default : 0
    }
    // Replies can be implemented with a reference to the parent comment.
}, {
    timestamps : true
})

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)