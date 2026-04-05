import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('terms-of-use')
  getTermsOfUse(): string {
    return 'Terms of Use: By using our service, you agree to follow our rules...';
  }

  @Public()
  @Get('privacy-policy')
  getPrivacyPolicy(): string {
    return 'Privacy Policy: We respect your privacy and protect your data...';
  }
}
