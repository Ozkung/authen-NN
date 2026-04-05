import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') || 'localhost',
      port: this.configService.get<number>('MAIL_PORT') || 1025,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const url = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: '"No Reply" <noreply@example.com>',
      to: email,
      subject: 'Verify your email',
      html: `Click <a href="${url}">here</a> to verify your email.`,
    });
  }

  async sendResetPasswordEmail(email: string, token: string) {
    const url = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: '"No Reply" <noreply@example.com>',
      to: email,
      subject: 'Reset your password',
      html: `Click <a href="${url}">here</a> to reset your password. The link is valid for 1 hour.`,
    });
  }
}
