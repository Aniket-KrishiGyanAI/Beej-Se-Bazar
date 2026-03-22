import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true
    },
    sequence: {
        type: Number,
        default: 0
    }
});

export const Counter = mongoose.model("Counter", CounterSchema);