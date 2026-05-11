import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store } from './schemas/store.schema';
import { StoreMember, StoreRole } from './schemas/store-member.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<Store>,
    @InjectModel(StoreMember.name) private memberModel: Model<StoreMember>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(
    name: string,
    ownerId: string,
    extras?: {
      logo?: string;
      businessType?: string;
      operatingHours?: number;
      openTime?: string;
      closeTime?: string;
      googleMapLink?: string;
    },
  ): Promise<Store> {
    const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 40);
    const slug = `${base}-${Date.now().toString(36)}`;
    const store = await this.storeModel.create({ name, slug, owner: ownerId, ...extras });
    await this.memberModel.create({ store: store._id, user: ownerId, role: StoreRole.OWNER });
    return store;
  }

  async findById(id: string): Promise<Store | null> {
    return this.storeModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<Store | null> {
    return this.storeModel.findOne({ slug }).exec();
  }

  async findMember(storeId: string, userId: string): Promise<StoreMember | null> {
    return this.memberModel.findOne({ store: storeId, user: userId }).exec();
  }

  async findUserStores(userId: string): Promise<{ store: Store; role: string }[]> {
    const members = await this.memberModel
      .find({ user: userId })
      .populate<{ store: Store }>('store')
      .exec();
    return members.map((m) => ({ store: m.store, role: m.role }));
  }

  async addMember(storeId: string, userId: string, role: StoreRole): Promise<StoreMember> {
    const existing = await this.memberModel.findOne({ store: storeId, user: userId }).exec();
    if (existing) throw new ConflictException('User is already a member of this store');
    return this.memberModel.create({ store: storeId, user: userId, role });
  }

  async removeMember(storeId: string, userId: string): Promise<void> {
    await this.memberModel.deleteOne({ store: storeId, user: userId }).exec();
  }

  async findStoreMembers(storeId: string): Promise<{ user: Partial<User>; role: string }[]> {
    const members = await this.memberModel
      .find({ store: storeId })
      .populate<{ user: User }>('user', 'email displayName')
      .exec();
    return members.map((m) => ({ user: m.user, role: m.role }));
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }
}
