import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { StoresService } from '../stores/stores.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private storesService: StoresService,
  ) {}

  async register(
    email: string,
    pass: string,
    displayName?: string,
    gender?: string,
    birthDate?: string,
  ) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      verificationToken,
      displayName,
      gender,
      birthDate: birthDate ? new Date(birthDate) : undefined,
    });

    try {
      await this.mailService.sendVerificationEmail(email, verificationToken);
    } catch {
      await this.usersService.deleteById(user._id as any);
      throw new BadRequestException(
        'Failed to send verification email. Please try again.',
      );
    }

    return {
      message: 'User registered. Please check your email to verify account.',
    };
  }

  async login(email: string, pass: string, identityStore?: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isVerified) throw new UnauthorizedException('Please verify your email first');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    let storeSlug: string | undefined;
    let role: string | undefined;

    if (identityStore) {
      const store = await this.storesService.findBySlug(identityStore);
      if (!store) throw new UnauthorizedException('Store not found');

      const member = await this.storesService.findMember(
        store._id as any,
        user._id as any,
      );
      if (!member) throw new UnauthorizedException('You do not have access to this store');

      storeSlug = store.slug;
      role = member.role;
    }

    const payload = { sub: user._id, email: user.email, storeSlug, role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      storeSlug: storeSlug ?? null,
      role: role ?? null,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.usersService.update(user._id as any, {
      isVerified: true,
      verificationToken: undefined,
    });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security, but we'll return success message
      return {
        message:
          'If your email is in our system, you will receive a reset link.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

    await this.usersService.update(user._id as any, {
      forgotPasswordToken: resetToken,
      forgotPasswordExpires: resetExpires,
    });

    await this.mailService.sendResetPasswordEmail(email, resetToken);

    return { message: 'Reset password link sent to your email.' };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.usersService.update(user._id as any, {
      password: hashedPassword,
      forgotPasswordToken: undefined,
      forgotPasswordExpires: undefined,
    });

    return { message: 'Password reset successfully. You can now login.' };
  }
}
