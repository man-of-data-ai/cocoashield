import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { UpdateOwnAccountDto, UpdateUserProfileDto } from './dtos/update-user-profile.dto';
import { UsersService } from './users.service';

@Controller(`${routes.version}${routes.users.root}`)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Session() session: UserSession) {
    return this.usersService.listForAdmin(session.user.id);
  }

  @Get('/me/profile')
  me(@Session() session: UserSession) {
    return this.usersService.current(session.user.id);
  }

  @Patch('/me/account')
  updateMe(
    @Session() session: UserSession,
    @Body() dto: UpdateOwnAccountDto,
  ) {
    return this.usersService.updateOwnAccount(session.user.id, dto);
  }

  @Patch('/:id/profile')
  update(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateForAdmin(session.user.id, id, dto);
  }

  @Delete('/:id')
  remove(@Session() session: UserSession, @Param('id') id: string) {
    return this.usersService.deleteForAdmin(session.user.id, id);
  }
}
