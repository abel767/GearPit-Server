const cloudinary = require('../../config/cloudinary');

const cloudinaryImageUpload = async (req, res) => {
    console.log('Cloudinary get request');

    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const uploadPreset = process.env.CLOUDINARY_PRESET_NAME;

        // Log environment variables for debugging
        console.log('Cloudinary Name:', process.env.CLOUDINARY_NAME);
        console.log('Cloudinary API Key:', process.env.CLOUDINARY_API_KEY);
        console.log('Cloudinary API Secret:', process.env.CLOUDINARY_API_SECRET);
        console.log('Cloudinary Preset Name:', uploadPreset);

        const stringToSign = `timestamp=${timestamp}&upload_preset=${uploadPreset}`;
        const signature = cloudinary.utils.api_sign_request({
            timestamp,
            upload_preset: uploadPreset,
        },
        process.env.CLOUDINARY_API_SECRET);

        // Log the signature for debugging
        console.log('Cloudinary signature:', signature);

        // Return the upload URL along with other details
        const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_NAME}/image/upload`;

        res.status(200).json({
            signature,
            timestamp,
            uploadPreset: uploadPreset,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_NAME,
            uploadUrl: uploadUrl,
        });
    } catch (error) {
        console.error('Error generating Cloudinary signature:', error);
        res.status(500).json({ message: 'Cloudinary config failed' });
    }
};

module.exports = {
    cloudinaryImageUpload,
};
