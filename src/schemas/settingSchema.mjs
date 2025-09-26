import mongoose from "mongoose";


const settingSchema = new mongoose.Schema({
  serviceRegions: [
    {
      name: { type: String }
    }
  ],
  notifications: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
});

export default mongoose.model("Setting", settingSchema);