import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  task_name: String,
  description: String,
  frequency: String,
  tips: String,
});

const IrrigationSchema = new mongoose.Schema({
  required: Boolean,
  frequency: String,
  amount_mm_per_week: Number,
  method: String,
});

const FertilizerSchema = new mongoose.Schema({
  required: Boolean,
  type: String,
  dose_kg_per_hectare: Number,
  application_method: String,
});

const PestDiseaseSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ["pest", "disease"] },
  symptoms: String,
  control_method: String,
});

const WeatherSchema = new mongoose.Schema({
  temperature_min_celsius: Number,
  temperature_max_celsius: Number,
  humidity_percent: Number,
  rainfall_mm: Number,
});

const StageSchema = new mongoose.Schema({
  stage_id: Number,
  stage_name: String,
  category: {
    type: String,
    enum: ["sowing", "growth_care", "harvesting", "post_harvest"],
  },
  start_day: Number,
  end_day: Number,
  duration_days: Number,
  description: String,
  tasks: [TaskSchema],
  irrigation: IrrigationSchema,
  fertilizer: FertilizerSchema,
  pest_and_disease: [PestDiseaseSchema],
  weather_conditions: WeatherSchema,
});

const StorageSchema = new mongoose.Schema({
  method: String,
  temperature_celsius: Number,
  humidity_percent: Number,
  shelf_life: String,
  tips: String,
});

const CropCalendarSchema = new mongoose.Schema(
  {
    crop_name_english: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    crop_name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // Store lowercase for case-insensitive lookup
      set: (v) => v.toLowerCase().trim(),
    },
    scientific_name: String,
    crop_type: String,
    total_duration_days: Number,
    stages: [StageSchema],
    harvest_indicators: [String],
    expected_yield_per_hectare: String,
    storage: StorageSchema,
    // Track when data was generated from AI
    generated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const CropCalendar = mongoose.model("CropCalendar", CropCalendarSchema);