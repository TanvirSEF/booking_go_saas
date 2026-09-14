import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

export interface ICounterDocument extends Document<string> {
  _id: string;
  seq: number;
}

export interface ICounterModel extends Model<ICounterDocument> {
  getNextSequence(name: string): Promise<number>;
}

const CounterSchema = new Schema<ICounterDocument, ICounterModel>(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

CounterSchema.statics.getNextSequence = async function (name: string): Promise<number> {
  const result = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  ).lean<{ seq: number }>();

  return result?.seq ?? 1;
};

export const Counter =
  (mongoose.models.Counter as unknown as ICounterModel) ||
  mongoose.model<ICounterDocument, ICounterModel>('Counter', CounterSchema);

export default Counter;
