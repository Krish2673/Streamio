import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {APIError} from "../utils/APIError.js"
import {APIResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query
    
    if(userId) {
        if(!isValidObjectId(userId)) {
            throw new APIError(400, "Invalid User id")
        }

        const user = await User.findById(userId);
        if(!user) {
            throw new APIError(404, "User not Found")
        }
    }

    const pipeline = [
        {
            $lookup: {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "ownerDetails"
            }
        },
        {
            $unwind : "$ownerDetails",
            preserveNullAndEmptyArrays : true
        },
        {
            $match : {
                $and : [
                    {
                        $or : [
                            query ? {title : {$regex : query, $options : "i"}} : {},
                            query ? {description : {$regex : query, $options : "i"}} : {},
                            query ? {"ownerDetails.name" : {$regex : query, $options : "i"}} : {}
                        ]
                    },
                    {
                        $or : [
                            {isPublished : true},
                            userId ? {owner : new mongoose.Types.ObjectId(userId)} : {}
                        ]
                    }
                ]
            }
        },
        {
            $sort : {
                [sortBy] : sortType === "asc" ? 1 : -1
            }
        }
    ]

    const result = await Video.aggregatePaginate(pipeline, {page,limit});

    return res.status(200).json(
        new APIResponse(200, result, "Videos fetched Successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    if(!title || !description || !req.files["videoFile"]?.length || !req.files["thumbnail"]?.length) {
        throw new APIError(400, "All fields are required")
    }

    const videoPath = req.files?.videoFile[0]?.path
    if(!videoPath) {
        throw new APIError(400, "Video file is required")
    }

    const video = await uploadOnCloudinary(videoPath)
    if(!video) {
        throw new APIError(500, "Error while uploading video on cloudinary")
    }

    const thumbnailPath = req.files?.thumbnail[0]?.path

    if(!thumbnailPath) {
        throw new APIError(400, "Thumbnail is required")
    }

    let thumbnail = await uploadOnCloudinary(thumbnailPath)

    if(!thumbnail) {
        thumbnail = await uploadOnCloudinary(thumbnailPath)
    }

    if(!thumbnail) {
        throw new APIError(500, "Error while uploading thumbnail on cloudinary")
    }

    const newVideo = await Video.create({
        title : title.trim(),
        description : description.trim(),
        videoFile : video.secure_url,
        thumbnail : thumbnail.secure_url,
        duration : video.duration,
        isPublished : true,
        owner : req.user._id,
        views : 0
    });

    return res.status(201).json(
        new APIResponse(201, newVideo, "Video Published Successfully")
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid Video id")
    }

    const video = await Video.findById(videoId).populate("owner", "username avatar")

    if(!video) {
        throw new APIError(404, "Video not Found")
    }

    if(req.user._id.toString() !== video.owner._id.toString()) {
        video.views += 1
        await video.save()
    }

    return res.status(200).json(
        new APIResponse(200, video, "Video fetched Successfully")
    )
}) 

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body

    if(!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid Video id")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new APIError(404, "Video not Found")
    }

    if(video.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You are not authorized to update this video")
    }

    if(title)
        video.title = title.trim()

    if(description)
        video.description = description.trim()

    if(req.file) {
        const thumbnail = await uploadOnCloudinary(req.file.path)

        if(!thumbnail) {
            throw new APIError(500, "Error while uploading thumbnail on cloudinary")
        }

        video.thumbnail = thumbnail.secure_url
    }

    await video.save()

    return res.status(200).json(
        new APIResponse(200, video, "Video Updated Successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid Video id")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new APIError(404, "Video not Found")
    }

    if(video.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You are not authorized to delete this video")
    }

    await video.deleteOne()     // or video.remove()

    return res.status(200).json(
        new APIResponse(200, null, "Video Deleted Successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid Video id")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new APIError(404, "Video not Found")
    }

    if(video.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You are not authorized to update this video")
    }

    video.isPublished = !video.isPublished
    await video.save()

    return res.status(200).json(
        new APIResponse(200, video, `Video ${video.isPublished ? "Published" : "Unpublished"} Successfully`)
    )
})

export { getAllVideos, publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus }