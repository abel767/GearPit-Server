const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cors = require('cors')


const app = express()



dotenv.config()

// middlewares
app.use(express.json())
app.use(express.urlencoded({encoded: true}))
app.use(cors(corsOptions))


// connecting to mongoDB

mongoose.connect(process.env.MONGO_URL)
.then(()=>{
    console.log(`MongoDB connected to ${mongoose.connection}`)
})
.catch(error=>{
    console.error('MongoDB connection error', error)
})


app.listen(process.env.PORT, ()=>{
    console.log(`server is running on http://localhost:${PORT}`)
})