import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Store extends Document {
  @Prop({ unique: true, lowercase: true, trim: true, index: true })
  slug?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop()
  logo?: string;

  @Prop()
  businessType?: string;

  @Prop({ min: 2, max: 24 })
  operatingHours?: number;

  @Prop()
  openTime?: string;

  @Prop()
  closeTime?: string;

  @Prop()
  googleMapLink?: string;
}

export const StoreSchema = SchemaFactory.createForClass(Store);
