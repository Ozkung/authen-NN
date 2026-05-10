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
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoreRole } from './schemas/store-member.schema';

@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  /** List all stores the current user belongs to */
  @Get('mine')
  async myStores(@Request() req) {
    return this.storesService.findUserStores(req.user.sub);
  }

  /** Create a new store — caller becomes owner */
  @Post()
  async create(@Body() body: { name: string; slug: string }, @Request() req) {
    return this.storesService.create(body.name, body.slug, req.user.sub);
  }

  /** List members of a store (owner/admin only) */
  @Get(':slug/members')
  async listMembers(@Param('slug') slug: string, @Request() req) {
    const store = await this.storesService.findBySlug(slug);
    if (!store) throw new NotFoundException('Store not found');

    const caller = await this.storesService.findMember(store._id as any, req.user.sub);
    if (!caller || (caller.role !== StoreRole.OWNER && caller.role !== StoreRole.ADMIN)) {
      throw new ForbiddenException('Only owner or admin can view members');
    }

    return this.storesService.findStoreMembers(store._id as any);
  }

  /** Add a member to a store by email (owner/admin only) */
  @Post(':slug/members')
  async addMember(
    @Param('slug') slug: string,
    @Body() body: { email?: string; userId?: string; role: StoreRole },
    @Request() req,
  ) {
    const store = await this.storesService.findBySlug(slug);
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
  @Delete(':slug/members/:userId')
  async removeMember(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    const store = await this.storesService.findBySlug(slug);
    if (!store) throw new NotFoundException('Store not found');

    const caller = await this.storesService.findMember(store._id as any, req.user.sub);
    if (!caller || caller.role !== StoreRole.OWNER) {
      throw new ForbiddenException('Only owner can remove members');
    }

    await this.storesService.removeMember(store._id as any, userId);
    return { message: 'Member removed' };
  }
}
