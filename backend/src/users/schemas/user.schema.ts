import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  displayName: string;

  @Prop()
  gender: string;

  @Prop()
  birthDate: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationToken: string;

  @Prop()
  forgotPasswordToken?: string;

  @Prop()
  forgotPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
