import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, AuthService } from '@thallesp/nestjs-better-auth';
import type { Auth } from './auth.provider';
import { RegisterDto } from './dto/register.dto';
import { Constants } from '../../core/constants/constants';
import { auth_routes } from '../../routes';
import { UsersService } from '../users/users.service';

@ApiTags('Authentification')
@AllowAnonymous()
@Controller(Constants.API.VERSION)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post(auth_routes.register)
  @ApiOperation({ summary: 'Créer un compte et son profil applicatif' })
  async register(
    @Body() { email, username, password, confirmPassword }: RegisterDto,
  ) {
    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Le mot de passe et sa confirmation doivent être identiques.',
      );
    }

    const auth = this.authService.instance as unknown as Auth;

    const result = await auth.api.signUpEmail({
      body: { email, password, name: username, username },
    });
    // Le profil applicatif est créé ici, à l'inscription : aucune lecture
    // ultérieure n'a besoin de l'écrire.
    if (result?.user?.id) {
      await this.usersService.createProfile(result.user.id);
    }
    return result;
  }
}
