const Banner = require('../../models/Banner/bannerModel')

const getAllBanners = async (req,res)=>{
    try{
        const banners = await Banner.find().sort({displayOrder: 1})
        res.status(200).json(banners)
    }catch(error){
        res.status(500).json({message: 'Error fetching banners'})
    }
}

const addBanner = async(req,res)=>{
    try{
        const {title, imageUrl, link, displayOrder} = req.body
        const banner = new Banner({
            title,
            imageUrl,
            link,
            displayOrder: displayOrder || 0
        })
        await banner.save()
        res.status(201).json(banner)
    }catch(error){
        res.status(500).json({message: 'Error adding banner'})
    }
}

const updateBanner = async(req,res)=>{
    try{
        const {id} = req.params
        const {title, imageUrl, link, isActive, displayOrder} = req.body
        const banner = await Banner.findByIdAndUpdate(
            id,
            {title, imageUrl, link, isActive, displayOrder},
            {new: true}
        )

        res.status(200).json(banner)
    }catch(error){
        res.status(500).json({message: 'error updating banner'})
    }
}

const deleteBanner = async(req,res)=>{
    try{
        const {id} = req.params
        await Banner.findByIdAndDelete(id)
        res.status(200).json({mesasge:'banner deleted successfully'})
    }catch(error){
        res.status(500).json({message: 'Error deleting banner'})
    }
}


const toggleBannerStatus = async(req,res)=>{
    try{
        const {id} = req.params;
        const banner = await Banner.findById(id)
        banner.isActive = !banner.isActive
        await banner.save()
        res.status(200).json(banner)
    }catch(error){
        res.status(500).json({message: 'Error toggling banner status'})

    }
}

const getActiveBanners = async(req,res)=>{
    try{
        const banners = await Banner.find({isActive: true}).sort({displayOrder: 1})
        res.status(200).json(banners)
    }catch(error){
        res.status(500).json({message: 'Error fetching active banners'})
    }
}


module.exports = {
    getAllBanners,
    addBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
    getActiveBanners
}

