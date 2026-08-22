import { Constants } from '../../core/constants/constants';

const auth_root = 'auth';
const user_root = 'users';

export const auth_routes = {
  /**
   * better-auth monte ses propres endpoints (sign-in, sign-up, session, ...)
   * en middleware et revendique tout ce préfixe : rien d'autre ne peut y être
   * routé. Les endpoints d'inscription vivent donc sous `users`.
   */
  base_path: `/${Constants.API.VERSION}/${auth_root}`,
  register: `${user_root}/register`,
};
