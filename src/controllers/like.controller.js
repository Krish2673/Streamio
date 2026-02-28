import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {APIError} from "../utils/APIError.js"
import {APIResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if(!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid Video id")
    }

    // const video = await mongoose.model("Video").findById(videoId)
    // const video = await Video.findById(videoId)                     // optional (not suitable when the system scales as it adds an extra db request)

    // if(!video) {                                         // instead use Video.exists({_id : videoId}) which is more efficient as it does not fetch the entire document
    //     throw new APIError(404, "Video not found")
    // }

    const likeExists = await Like.findOne({video : videoId, likedBy : req.user._id})

    if(likeExists) {
        await likeExists.deleteOne()
        await Video.findByIdAndUpdate(videoId, {
            $inc : {likeCount : -1}
        })
    }

    else {
        await Like.create({
            video : videoId,
            likedBy : req.user._id
        })
        await Video.findByIdAndUpdate(videoId, {
            $inc : {likeCount : 1}
        })
    }

    const isLiked = likeExists ? false : true

    return res.status(200).json(
        new APIResponse(200, isLiked, `Video ${likeExists ? "unliked" : "liked"} Successfully`)
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if(!isValidObjectId(commentId)) {
        throw new APIError(400, "Invalid Comment id")
    }

    // const comment = await Comment.findById(commentId)        

    // if(!comment) {
    //     throw new APIError(404, "Comment not found")
    // }

    const likeExists = await Like.findOne({comment : commentId, likedBy : req.user._id})

    if(likeExists) {
        await likeExists.deleteOne()
        await Comment.findByIdAndUpdate(commentId, {
            $inc : {likeCount : -1}
        })
    }

    else {
        await Like.create({
            comment : commentId,
            likedBy : req.user._id
        })
        await Comment.findByIdAndUpdate(commentId, {
            $inc : {likeCount : 1}
        })
    }

    const isLiked = likeExists ? false : true

    return res.status(200).json(
        new APIResponse(200, isLiked, `Comment ${likeExists ? "unliked" : "liked"} Successfully`)
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {

    // const likedVideos = await Like.find({
    //     likedBy : req.user._id, video : {$exists : true}        // $ne : null => (not equal to null)
    // }).populate("video").sort({createdAt : -1})

    const pipeline = Like.aggregate([
        {
            $match : {
                likedBy : req.user._id, 
                video : {$ne : null}
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as : "video"
            }
        },
        {
            $unwind : "$video"
        },
        {
            $sort : {
                createdAt : -1
            }
        }
    ])

    const options = {
        page : parseInt(req.query.page) || 1,
        limit : parseInt(req.query.limit) || 10
    }

    const likedVideos = await Like.aggregatePaginate(pipeline, options)         // likedVideos.totalDocs  => total number of liked videos, likedVideos.docs => array of liked videos in the current page

    return res.status(200).json(
        new APIResponse(200, likedVideos, "Liked Videos fetched Successfully")
    )
})

export { toggleCommentLike, toggleVideoLike, getLikedVideos }