import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export enum StoreRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  STAFF = 'staff',
}

@Schema({ timestamps: true })
export class StoreMember extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(StoreRole), default: StoreRole.STAFF })
  role: StoreRole;
}

export const StoreMemberSchema = SchemaFactory.createForClass(StoreMember);

// compound index: user+store unique pair
StoreMemberSchema.index({ store: 1, user: 1 }, { unique: true });
