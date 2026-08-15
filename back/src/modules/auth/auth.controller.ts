import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AllowAnonymous, AuthService } from '@thallesp/nestjs-better-auth';
import type { Auth } from './auth.provider';
import { RegisterDto } from './dto/register.dto';
import { routes } from '../../routes';
import { UsersService } from '../users/users.service';

@AllowAnonymous()
@Controller(`${routes.version}${routes.users.root}`)
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly usersService: UsersService) {}

  @Post(routes.users.register)
  async register(
    @Body() { email, username, password, confirmPassword }: RegisterDto,
  ) {
    if (password !== confirmPassword) {
      throw new BadRequestException('password and confirmPassword must match');
    }

    const auth = this.authService.instance as unknown as Auth;

    const result = await auth.api.signUpEmail({
      body: { email, password, name: username, username },
    });
    if (result?.user?.id) await this.usersService.ensureProfile(result.user.id);
    return result;
  }
}
