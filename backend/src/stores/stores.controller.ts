import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { StoresService } from './stores.service';
import { StoreRole } from './schemas/store-member.schema';

const logoStorage = diskStorage({
  destination: './uploads/logos',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/)) {
    return cb(new BadRequestException('Only image files are allowed'), false);
  }
  cb(null, true);
};

@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  /** List all stores the current user belongs to */
  @Get('mine')
  async myStores(@Request() req: any) {
    return this.storesService.findUserStores(req.user.sub);
  }

  /** Create a new store — _id becomes the URL identifier */
  @Post()
  @UseInterceptors(FileInterceptor('logo', {
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: imageFilter,
  }))
  async create(
    @UploadedFile() logo: Express.Multer.File | undefined,
    @Body() body: {
      name: string;
      businessType?: string;
      operatingHours?: string;
      openTime?: string;
      closeTime?: string;
      googleMapLink?: string;
    },
    @Request() req: any,
  ) {
    const hours = body.operatingHours ? Number(body.operatingHours) : undefined;
    return this.storesService.create(body.name, req.user.sub, {
      logo: logo ? `/uploads/logos/${logo.filename}` : undefined,
      businessType: body.businessType || undefined,
      operatingHours: hours,
      openTime: hours && hours < 24 ? body.openTime : undefined,
      closeTime: hours && hours < 24 ? body.closeTime : undefined,
      googleMapLink: body.googleMapLink || undefined,
    });
  }

  /** List members of a store (owner/admin only) */
  @Get(':storeId/members')
  async listMembers(@Param('storeId') storeId: string, @Request() req: any) {
    const store = await this.storesService.findById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    const caller = await this.storesService.findMember(store._id as any, req.user.sub);
    if (!caller || (caller.role !== StoreRole.OWNER && caller.role !== StoreRole.ADMIN)) {
      throw new ForbiddenException('Only owner or admin can view members');
    }

    return this.storesService.findStoreMembers(store._id as any);
  }

  /** Add a member to a store by email (owner/admin only) */
  @Post(':storeId/members')
  async addMember(
    @Param('storeId') storeId: string,
    @Body() body: { email?: string; userId?: string; role: StoreRole },
    @Request() req: any,
  ) {
    const store = await this.storesService.findById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    const caller = await this.storesService.findMember(store._id as any, req.user.sub);
    if (!caller || (caller.role !== StoreRole.OWNER && caller.role !== StoreRole.ADMIN)) {
      throw new ForbiddenException('Only owner or admin can add members');
    }

    let targetId = body.userId;
    if (!targetId && body.email) {
      const user = await this.storesService.findUserByEmail(body.email);
      if (!user) throw new BadRequestException('No user found with that email');
      targetId = (user._id as any).toString();
    }
    if (!targetId) throw new BadRequestException('Provide email or userId');

    return this.storesService.addMember(store._id as any, targetId, body.role);
  }

  /** Remove a member from a store (owner only) */
  @Delete(':storeId/members/:userId')
  async removeMember(
    @Param('storeId') storeId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const store = await this.storesService.findById(storeId);
    if (!store) throw new NotFoundException('Store not found');

    const caller = await this.storesService.findMember(store._id as any, req.user.sub);
    if (!caller || caller.role !== StoreRole.OWNER) {
      throw new ForbiddenException('Only owner can remove members');
    }

    await this.storesService.removeMember(store._id as any, userId);
    return { message: 'Member removed' };
  }
}
