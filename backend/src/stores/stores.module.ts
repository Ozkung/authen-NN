import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Store, StoreSchema } from './schemas/store.schema';
import { StoreMember, StoreMemberSchema } from './schemas/store-member.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Store.name, schema: StoreSchema },
      { name: StoreMember.name, schema: StoreMemberSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [StoresService],
  controllers: [StoresController],
  exports: [StoresService],
})
export class StoresModule {}
